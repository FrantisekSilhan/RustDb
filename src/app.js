const express = require("express");
const app = express();
const port = 6978;

const fs = require("fs");
const path = require("path");
const logger = require("./logger");
logger.setLevel("INFO");

app.use(express.urlencoded({ extended: true }));

app.get("/api/item", async (req, res) => {
  const item = req.query.item;
  const { db } = require("./db");

  try {
    const dbItem = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM items WHERE LOWER(name) = ?", [item.toLowerCase()], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
  
        resolve(row);
      });
    });

    if (!dbItem) {
      return res.status(404).json({ success: false, error: "Item not found" });
    }

    const itemListings = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM item_listings WHERE id = ?", [dbItem.id], (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(row);
      });
    });

    if (!itemListings) {
      return res.status(404).json({ success: false, error: "Item listings not found" });
    }

    const itemInstantListings = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM item_instant_listings WHERE id = ?", [dbItem.id], (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(row);
      });
    });

    return res.json({ success: true, data: { ...dbItem, ...itemListings, ...itemInstantListings }});
  } catch (err) {
    fs.appendFileSync(path.join(__dirname, "..", "logs", "error.log"), `Error fetching item ${item}: ${err}\n`);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

app.get("/updates.xml", (_, res) => {
  res.sendFile(path.join(__dirname, "..", "updates.xml"));
});

app.get("/bandit_scrapalizer.crx", (_, res) => {
  res.sendFile(path.join(__dirname, "..", "bandit_scrapalizer.crx"));
});

app.get("")

app.use((_, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

app.listen(port, async () => {
  const paths = [
    path.join(__dirname, "..", "data"),
    path.join(__dirname, "..", "logs"),
  ];
  
  paths.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
  });
  
  require("./db").serialize();

  logger.debug(`Server is running on port ${port}\nhttp://localhost:${port}`);

  const { fetch_market_data, load_last_params } = require("./market"); 
  const { fetch_histogram_data, load_last_items_save } = require("./histogram");
  load_last_params();
  load_last_items_save();
  setInterval(fetch_market_data, 30000);
  setInterval(fetch_histogram_data, 5000);
});