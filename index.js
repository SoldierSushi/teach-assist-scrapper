const express = require("express");
const puppeteer = require('puppeteer');
const path = require('path');

const app = express();

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/results', (async (req, res) => {
    const browser = await puppeteer.launch({});

    const page = await browser.newPage();
    await page.goto("https://ta.yrdsb.ca/yrdsb/");
    await page.screenshot({ path: "image.png"});

    await page.waitForSelector('td input[name="username"]');
    await page.type('td input[name="username"]', 'username');
    await page.type('td input[name="password"]', 'password');
    await page.click('td input[name="submit"]');

    await page.waitForNavigation({ waitUntil: "domcontentloaded" });
    await page.waitForSelector('table');

    const info = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('table tbody tr:not(:first-child)'));

        return rows.map(row => {
            const columns = row.querySelectorAll('td');
            let course = columns[0]?.innerText.trim().split('\n')[0];
            let grade = columns[2]?.innerText.trim();
            if(grade == course || course.includes('password') || grade == 'Please see teacher for current status regarding achievement in the course'){
                return;
            }else{
                if(grade.includes('current mark = ')){
                    grade = grade.split('= ')[1];
                }
                return {
                    course: course,
                    grade: grade,
                }
            }
        }).filter(Boolean); //removes null values
    });

    await browser.close();
    res.json(info);
}));

app.listen(8080, () => {
    console.log('server is listening on port 8080');
});