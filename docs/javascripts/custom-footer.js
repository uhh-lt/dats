document.addEventListener("DOMContentLoaded", function () {
  const config = JSON.parse(document.getElementById("__config").textContent);
  const baseUrl = config.base;

  const logosHtml = `
    <div style="display: flex; gap: 24px; align-items: center; justify-content: center; flex: 1; padding: 0 16px;">
      <a href="https://www.uni-hamburg.de/" target="_blank" rel="noopener noreferrer" title="University of Hamburg">
        <img src="${baseUrl}/assets/uhh-logo.png" alt="UHH" style="height: 80px; width: auto;">
      </a>
      <a href="https://www.hcds.uni-hamburg.de/" target="_blank" rel="noopener noreferrer" title="Hub of Computing & Data Science">
        <img src="${baseUrl}/assets/hcds-logo.png" alt="HCDS" style="height: 80px; width: auto;">
      </a>
    </div>
  `;

  const copyrightDiv = document.querySelector(".md-copyright");
  if (copyrightDiv) {
    copyrightDiv.insertAdjacentHTML("afterend", logosHtml);
  }
});
