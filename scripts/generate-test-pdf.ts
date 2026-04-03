import "dotenv/config";
import puppeteer from "puppeteer-core";
import * as fs from "fs";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: "shell" as const,
    args: ["--no-sandbox"],
    defaultViewport: { width: 1920, height: 1080 },
  });
  const page = await browser.newPage();
  await page.goto("http://localhost:3000/de/worksheet/U9kOhnvA36/print", { waitUntil: "networkidle0", timeout: 30000 });
  await page.evaluateHandle("document.fonts.ready");
  await new Promise((r) => setTimeout(r, 500));

  // Check ALL computed font-sizes deeply - every element in every block
  const results = await page.evaluate(() => {
    const blocks = document.querySelectorAll(".worksheet-block");
    const out: string[] = [];
    
    blocks.forEach((block) => {
      const classes = (block as HTMLElement).className;
      const type = classes.replace("worksheet-block worksheet-block-", "").split(" ")[0];
      
      // Get ALL elements inside this block and their computed font-sizes
      const allElements = block.querySelectorAll("*");
      const sizes = new Map<string, number>();
      allElements.forEach((el) => {
        const fs = window.getComputedStyle(el).fontSize;
        sizes.set(fs, (sizes.get(fs) || 0) + 1);
      });
      
      const sizeStr = Array.from(sizes.entries()).map(([s, c]) => `${s}(×${c})`).join(", ");
      out.push(`${type.padEnd(25)} | ${sizeStr}`);
    });

    // Also check print-body-content
    const body = document.querySelector(".print-body-content");
    if (body) {
      out.unshift(`BODY-CONTENT               | ${window.getComputedStyle(body).fontSize}`);
    }
    return out;
  });

  console.log("=== COMPUTED FONT SIZES (all children) ===");
  results.forEach((r: string) => console.log(r));

  // Now generate the actual PDF
  const pdfBuffer = await page.pdf({
    format: "A4",
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
    printBackground: true,
  });
  fs.writeFileSync("/tmp/test-output.pdf", pdfBuffer);
  console.log("\n=== PDF saved to /tmp/test-output.pdf ===");
  console.log(`PDF size: ${pdfBuffer.length} bytes`);

  await browser.close();
})();
