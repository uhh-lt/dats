document.addEventListener("DOMContentLoaded", function () {
  const config = JSON.parse(document.getElementById("__config").textContent);
  const baseUrl = config.base;

  const footerInner = document.querySelector(".md-footer-meta__inner");
  const copyrightDiv = document.querySelector(".md-copyright");
  const socialDiv = document.querySelector(".md-social");

  if (footerInner && copyrightDiv) {
    // 1. Create the Left Container for your logos
    const logosContainer = document.createElement("div");
    logosContainer.style.display = "flex";
    logosContainer.style.gap = "24px";
    logosContainer.style.alignItems = "center";

    logosContainer.innerHTML = `
      <a href="https://www.uni-hamburg.de/" target="_blank" rel="noopener noreferrer" title="University of Hamburg">
        <img src="${baseUrl}/assets/uhh-logo.png" alt="UHH" style="height: 80px; width: auto;">
      </a>
      <a href="https://www.hcds.uni-hamburg.de/" target="_blank" rel="noopener noreferrer" title="Hub of Computing & Data Science">
        <img src="${baseUrl}/assets/hcds-logo.png" alt="HCDS" style="height: 80px; width: auto;">
      </a>
    `;

    // 2. Create the Right Container (Stacked Layout)
    const rightContainer = document.createElement("div");
    rightContainer.style.display = "flex";
    rightContainer.style.flexDirection = "column";
    rightContainer.style.alignItems = "flex-end"; // Aligns everything to the right edge
    rightContainer.style.gap = "12px"; // Adds space between socials and copyright

    // 3. Move the existing MkDocs elements into our new Right Container
    // Appending them moves them safely without breaking their hover effects/links
    if (socialDiv) {
      rightContainer.appendChild(socialDiv);
    }
    rightContainer.appendChild(copyrightDiv);

    // Remove MkDocs default padding/margins so it aligns perfectly in our column
    copyrightDiv.style.padding = "0";
    copyrightDiv.style.margin = "0";

    // 4. Update the main footer container to push the left and right sides apart
    footerInner.style.display = "flex";
    footerInner.style.justifyContent = "space-between";
    footerInner.style.alignItems = "center";
    footerInner.style.flexWrap = "wrap"; // Ensures it doesn't break on small mobile screens

    // 5. Clear the old footer structure and insert our newly organized containers
    footerInner.innerHTML = "";
    footerInner.appendChild(logosContainer);
    footerInner.appendChild(rightContainer);
  }
});
