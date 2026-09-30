const fs = require("fs");
const content = fs.readFileSync("/tmp/sdk.js", "utf-8");
const urls = content.match(/https:\/\/[^"'\s]+\.js/g);
console.log("Found URLs:", urls);
