const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const t = require("@babel/types");
const generator = require("@babel/generator").default;
const fs = require("fs");

// 读取混淆代码
const code = fs.readFileSync("ob_challenge1.js", "utf-8");

// 解析为 AST
const ast = parser.parse(code);

// 遍历 AST 进行变换
traverse(ast, {
  // 1. 常量计算与字符串拼接
  // 处理如 1*-3+6 或 '\x6c\x65\x6e'+'\x67\x74\x68'
  // BinaryExpression: {
  //   exit(path) {
  //     const { left, right, operator } = path.node;
  //
  //     // 数字计算
  //     if (t.isNumericLiteral(left) && t.isNumericLiteral(right)) {
  //       // 注意：eval 存在安全风险，但在此受控环境下处理简单的算术运算通常是可以接受的
  //       // 或者手动实现简单的 switch case
  //       let result;
  //       switch (operator) {
  //           case '+': result = left.value + right.value; break;
  //           case '-': result = left.value - right.value; break;
  //           case '*': result = left.value * right.value; break;
  //           case '/': result = left.value / right.value; break;
  //           case '%': result = left.value % right.value; break;
  //           // 处理位运算等其他情况...
  //           default: return;
  //       }
  //       path.replaceWith(t.numericLiteral(result));
  //     }
  //
  //     // 字符串拼接
  //     if (t.isStringLiteral(left) && t.isStringLiteral(right) && operator === '+') {
  //       path.replaceWith(t.stringLiteral(left.value + right.value));
  //     }
  //   }
  // },

  // 2. 处理成员表达式中的逗号表达式
  // 混淆特征: obj["\u2028", "prop"] -> 实际上等同于 obj["prop"]
  // MemberExpression(path) {
  //   if (t.isSequenceExpression(path.node.property)) {
  //     const expressions = path.node.property.expressions;
  //     // 取最后一个表达式作为真正的属性
  //     path.node.property = expressions[expressions.length - 1];
  //   }
  // },

  // 3. 移除字符串的 extra 属性，强制重新生成格式
  // 这有助于将 '\x6c' 这样的形式还原为 'l'
  // StringLiteral(path) {
  //  delete path.node.extra;
  // },
  
  // 4. 处理 NumericLiteral 的 extra 属性
  // NumericLiteral(path) {
  //     delete path.node.extra;
  // },

  // 5. 变量重命名：将 Unicode 乱码变量重命名为可读格式 (v_1, v_2...)
  // 在 Program 节点处理，确保能访问所有作用域
  Program(path) {
    let idCounter = 1;
    
    // 递归遍历所有作用域（包括函数作用域、块级作用域）
    path.traverse({
      Scope(scopePath) {
        renameScopeBindings(scopePath.scope);
      }
    });
    
    // 处理顶级作用域
    renameScopeBindings(path.scope);

    function renameScopeBindings(scope) {
      for (const bindingName in scope.bindings) {
        // 匹配非 ASCII 字符 (通常是混淆用的 Unicode 字符)
        if (/[^\x00-\x7F]/.test(bindingName)) {
          const newName = `_v${idCounter++}`;
          scope.rename(bindingName, newName);
        }
      }
    }
  }
});

// 生成解混淆后的代码
// jsescOption: { minimal: true } 会尽可能使用最短的表示，即还原 Unicode/Hex 转义
const output = generator(ast, {
  jsescOption: { minimal: true }
}).code;

// 写入结果
fs.writeFileSync("ob_challenge1_decoded.js", output);

console.log("解混淆完成，结果已保存至 ob_challenge1_decoded.js");
