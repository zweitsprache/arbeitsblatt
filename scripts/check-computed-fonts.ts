import "dotenv/config";
import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: "shell" as const,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  await page.goto("http://localhost:3000/de/worksheet/U9kOhnvA36/print", { waitUntil: "networkidle0", timeout: 30000 });
  await page.evaluateHandle("document.fonts.ready");

  const results = await page.evaluate(() => {
    const blocks = document.querySelectorAll(".worksheet-block");
    const out: string[] = [];
    blocks.forEach((block) => {
      const classes = (block as HTMLElement).className;
      const type = classes.replace("worksheet-block worksheet-block-", "").split(" ")[0];
      const computed = window.getComputedStyle(block as Element);
      const fontSize = computed.fontSize;
      // Check first text child
      const firstText = block.querySelector("span, p");
      const childSize = firstText ? window.getComputedStyle(firstText).fontSize : "N/A";
      out.push(`${type.padEnd(25)} | block: ${fontSize.padEnd(8)} | child: ${childSize}`);
    });
    // Also check print-body-content
    const body = document.querySelector(".print-body-content");
    if (body) {
      out.unshift(`BODY-CONTENT               | ${window.getComputedStyle(body).fontSize}`);
    }
    return out;
  });

  results.forEach((r: string) => console.log(r));
  await browser.close();
})();
