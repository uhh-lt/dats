const { Readability } = require("@mozilla/readability");
const jsdom = require("jsdom");
const express = require("express");

const argv = require("minimist")(process.argv.slice(2));
const { JSDOM } = jsdom;
const app = express();
app.use(express.json({ limit: "50mb" }));

const port = argv.p || argv.port || 6666;

// Parse with Readability
const parse = (file, url) => {
  const result = { title: "", byline: "", dir: "", content: "", textContent: "", length: 0, excerpt: "", siteName: "" };

  try {
    let doc = new JSDOM(file, {
      url: url,
    });
    let reader = new Readability(doc.window.document);
    const article = reader.parse();
    return article ? article : result;
  } catch (err) {
    return result;
  }
};

app.get("/", function (req, res) {
  console.log("I'm alive!");
  res.status(200).send("I'm alive!");
});

app.post("/", function (req, res) {
  if (req.body.html && req.body.url) {
    console.log("[READABILITY.JS] Parsing requested html...");
    res.json(parse(req.body.html, req.body.url));
  } else {
    res.status(400).send("property 'html' or 'url' is missing in the request body!");
  }
});

app.listen(port, function () {
  console.log(`Readability listening on port ${port}!`);
});
