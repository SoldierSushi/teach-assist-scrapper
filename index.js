const express = require("express");
const puppeteer = require("puppeteer");
const path = require("path");

const app = express();

// Middleware to parse JSON requests
app.use(express.json());

// Serve HTML file
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Change `/api/results` from GET to POST to accept user credentials
app.post("/api/results", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
    }

    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto("https://ta.yrdsb.ca/yrdsb/");

        await page.waitForSelector('td input[name="username"]');
        await page.type('td input[name="username"]', username);
        await page.type('td input[name="password"]', password);
        await page.click('td input[name="submit"]');

        await page.waitForNavigation({ waitUntil: "domcontentloaded" });
        await page.waitForSelector("table");

        const info = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll("table tbody tr:not(:first-child)"));

            return rows.map(row => {
                const columns = row.querySelectorAll("td");
                let course = columns[0]?.innerText.trim().split("\n")[0];
                let grade = columns[2]?.innerText.trim();

                if (grade === course || course.includes("password") || grade === "Please see teacher for current status regarding achievement in the course") {
                    return null;
                } else {
                    if (grade.includes("current mark = ")) {
                        grade = grade.split("= ")[1];
                    }
                    return { course, grade };
                }
            }).filter(Boolean); // Remove null values
        });

        await browser.close();
        res.json(info);
    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).json({ error: "An error occurred while fetching results" });
    }
});

// Start the server
app.listen(8080, () => {
    console.log("Server is listening on port 8080");
});
