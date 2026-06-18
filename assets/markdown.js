import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.esm.min.mjs";

mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "loose" });
marked.setOptions({ gfm: true, breaks: false, headerIds: false, mangle: false });

export { mermaid };

export function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Returns a function that maps heading text to a unique, URL-safe id so that
// repeated headings within one document never collide.
export function makeSlugger() {
  const used = new Set();
  return (text) => {
    const base = text.toLowerCase().trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-") || "section";
    let slug = base;
    let i = 2;
    while (used.has(slug)) slug = `${base}-${i++}`;
    used.add(slug);
    return slug;
  };
}

// Builds a marked renderer that turns ```mermaid fences into <div class="mermaid">
// and Markdown links to .svg files into inline <figure> images. Pass a slugger to
// give headings stable id attributes for in-page anchors (used by the TOC viewer).
export function createRenderer(slugger) {
  const renderer = new marked.Renderer();

  if (slugger) {
    renderer.heading = (text, level) => {
      const id = slugger(text.replace(/<[^>]+>/g, ""));
      return `<h${level} id="${id}">${text}</h${level}>`;
    };
  }

  renderer.code = (code, infostring) => {
    const lang = (infostring || "").trim().split(/\s+/)[0];
    if (lang === "mermaid") return `<div class="mermaid">${escapeHtml(code)}</div>`;
    return `<pre><code>${escapeHtml(code)}</code></pre>`;
  };

  renderer.link = (href, title, text) => {
    if (href && /\.svg($|[?#])/i.test(href)) {
      return `<figure class="fig"><img src="${href}" alt="${text || ""}" loading="lazy">`
           + `<figcaption>${text || ""}</figcaption></figure>`;
    }
    const t = title ? ` title="${title}"` : "";
    return `<a href="${href}"${t}>${text}</a>`;
  };

  return renderer;
}

export function renderMarkdown(md, slugger) {
  return marked.parse(md, { renderer: createRenderer(slugger) });
}

export async function loadText(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.text();
}

// Render each ```mermaid block one at a time. Batch mermaid.run() can race under
// headless PDF capture and overlay diagrams onto each other; rendering to an SVG
// string with a unique id per diagram and swapping it in avoids that.
export async function renderMermaid(root = document) {
  const blocks = Array.from(root.querySelectorAll(".mermaid"));
  for (let i = 0; i < blocks.length; i++) {
    const el = blocks[i];
    const code = el.textContent;
    const { svg } = await mermaid.render(`mmd-${i}-${Date.now()}`, code);
    el.innerHTML = svg;
    el.removeAttribute("data-processed");
  }
}

