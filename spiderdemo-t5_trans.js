const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generator = require("@babel/generator").default;
const fs = require("fs");

// 读取目标代码
const inputFile = "spiderdemo-t5.js";
const outputFile = "spiderdemo-t5_cleaned.js";
const code = fs.readFileSync(inputFile, "utf-8");

// 解析为 AST
const ast = parser.parse(code);

// 遍历 AST
traverse(ast, {
  // 移除所有 Debugger 语句
  DebuggerStatement(path) {
    path.remove();
  },

  // 移除反调试检测逻辑
  // 特征：if (!_first50_check["includes"]("deb")) { throw ... }
  IfStatement(path) {
    const { test, consequent } = path.node;
    
    // 检查 if 条件是否包含 "includes" 和 "deb"
    // 形式可能是: !_first50_check["includes"]("deb")
    if (test.type === "UnaryExpression" && test.operator === "!") {
        const argument = test.argument;
        if (argument.type === "CallExpression" &&
            argument.callee.type === "MemberExpression" &&
            argument.callee.property.type === "StringLiteral" &&
            argument.callee.property.value === "includes" &&
            argument.arguments.length > 0 &&
            argument.arguments[0].type === "StringLiteral" &&
            argument.arguments[0].value === "deb") {
            
            // 找到反调试代码块，直接移除整个 if 语句
            path.remove();
            return;
        }
    }
  },
  
  // 移除 toString 检测代码
  // 特征：const _fnStr_check = xxx["toString"]();
  //      const _first50_check = _fnStr_check["substring"](0, 50);
  VariableDeclaration(path) {
      const declarations = path.node.declarations;
      if (declarations.length > 0) {
          const id = declarations[0].id;
          if (id.name === "_fnStr_check" || id.name === "_first50_check") {
              path.remove();
          }
      }
  }
});

// 生成处理后的代码
const output = generator(ast).code;

// 写入结果
fs.writeFileSync(outputFile, output);

console.log(`处理完成，去除了 debugger 和反调试检测，结果已保存至 ${outputFile}`);
