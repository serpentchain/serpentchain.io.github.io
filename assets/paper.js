import { renderMarkdown, renderMermaid, loadText } from "./markdown.js";

const paper = document.getElementById("paper");
const source = document.body.dataset.source;

let md;
try {
  md = await loadText(source);
} catch (err) {
  paper.innerHTML = `<p style="color:#a00">Could not load ${source}: ${err.message}. Serve via a local web server.</p>`;
  throw err;
}

paper.innerHTML = renderMarkdown(md);

// The first paragraph after the title holds the author/date lines; center them.
const meta = paper.querySelector("h1")?.nextElementSibling;
if (meta?.tagName === "P") meta.classList.add("paper-meta");

await renderMermaid(paper);

// Wait for figure images so headless PDF capture renders them.
await Promise.all(
  Array.from(paper.querySelectorAll("img")).map((img) =>
    img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; })
  )
);
