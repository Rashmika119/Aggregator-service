const fs = require('fs');
require('dotenv').config();
const axios = require('axios');

const STATS_FILE = './stat.json';

function loadStats() {
    if (!fs.existsSync(STATS_FILE)) {
        fs.writeFileSync(STATS_FILE, JSON.stringify({
            v1Count: 0,
            v2Count: 0,
            totalCount: 0,
            v1Success: 0,
            v2Success: 0,
            v1Failures: 0,
            v2Failures: 0
        }, null, 2))
    }
    return JSON.parse(fs.readFileSync(STATS_FILE));
}

function saveStats(stats) {
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
}

let stats = loadStats();



let apiVersion = process.env.API_VERSION || 1;
const baseUrl = `http://localhost:5000/v${apiVersion}/trips`;

async function getApiCount(version) {
    if (version == 1) {
        stats.v1Count++;
    } else if (version == 2) {
        stats.v2Count++;
    } else {
        console.log("wrong endpoint call");
    }
    stats.totalCount++;
    saveStats(stats);

}

async function searchTrips(start, end, date) {
    await getApiCount(apiVersion);

    try {
        const response = await axios.get(`${baseUrl}/search`, {
            params: { startDestination: start, endDestination: end, departTime: date },
        });

        console.log(`API Version: v${apiVersion}`);
        console.log(`Response: `, response.data);


        if (apiVersion == 1) {
            stats.v1Success++;
        } else if (apiVersion == 2) {
            stats.v2Success++;
        }
        saveStats(stats)
    } catch (error) {
        console.error(`Error of calling v${apiVersion}: `, error.message);

        if (apiVersion == 1) {
            stats.v1Failures++;
        } else if (apiVersion == 2) {
            stats.v2Failures++;
        }
        saveStats(stats)
    }
    const shouldMigrate = await isTimeToMigrate(stats.totalCount, stats.v2Success);
    if (shouldMigrate) {
        console.log("Migration condition met. Time to switch fully to v2!");
    } else {
        console.log("Not ready to migrate yet.");
    }
        console.log(`V1 API count = ${stats.v1Count}`)
        console.log(`V2 API count = ${stats.v2Count}`)
        console.log(`V1 failures = ${stats.v1Failures}`)
        console.log(`V2 failures = ${stats.v2Failures}`)
        console.log(`v1 success = ${stats.v1Success}`)
        console.log(`v2 success = ${stats.v2Success}`)
}

async function isTimeToMigrate(totalCount, v2Success) {
    if (totalCount === 0) return false;
    const v2successRate = (v2Success / totalCount) * 100;
    return v2successRate >= 95 && totalCount >= 20;
}

searchTrips("CMB", "HMBT", "2025-10-08");
