import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const url = process.env.PRINT_FIXTURE_URL || "http://localhost:3000/de/debug/print-fixture";
const outputPath = process.env.PRINT_FIXTURE_PDF_PATH || "/tmp/print-fixture.pdf";
const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const browser = await puppeteer.launch({
  executablePath,
  headless: "shell",
  args: ["--no-sandbox"],
  defaultViewport: { width: 1920, height: 1080 },
});

try {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
  await page.evaluateHandle("document.fonts.ready");

  const pdfBuffer = await page.pdf({
    format: "A4",
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
    printBackground: true,
  });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, pdfBuffer);

  console.log(`Fixture URL: ${url}`);
  console.log(`Saved PDF: ${outputPath}`);
  console.log(`PDF size: ${pdfBuffer.length} bytes`);
} finally {
  await browser.close();
}