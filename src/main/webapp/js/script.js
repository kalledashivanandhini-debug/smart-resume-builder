const form = document.getElementById("resumeForm");
const resumeOutput = document.getElementById("resumeOutput");
const resumeContent = document.getElementById("resumeContent");
const generateButton = document.getElementById("generateButton");

function getValue(id) {
    return document.getElementById(id).value.trim();
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (character) {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };
        return entities[character];
    });
}

function makeTextSection(title, value) {
    if (value == null || String(value).trim() === "") {
        return "";
    }

    return `
        <section class="resume-section">
            <h2>${escapeHTML(title)}</h2>
            <p>${escapeHTML(value)}</p>
        </section>
    `;
}

function makeLink(label, profileURL) {
    if (!profileURL) return "";

    try {
        const url = new URL(profileURL);

        if (url.protocol !== "https:" && url.protocol !== "http:") {
            return "";
        }

        return `
            <p>
                <strong>${escapeHTML(label)}:</strong>
                <a href="${escapeHTML(url.href)}"
                   target="_blank" rel="noopener noreferrer">
                   ${escapeHTML(profileURL)}
                </a>
            </p>
        `;
    } catch {
        return "";
    }
}

function getUsername(profileURL, platform) {
    if (!profileURL) return "";

    try {
        const url = new URL(profileURL);
        const host = url.hostname.toLowerCase();
        const parts = url.pathname.split("/").filter(Boolean);

        if (platform === "github" && host === "github.com") {
            return parts[0] || "";
        }

        if (
            platform === "leetcode" &&
            (host === "leetcode.com" || host === "www.leetcode.com")
        ) {
            return parts[0] === "u" ? (parts[1] || "") : (parts[0] || "");
        }

        if (
            platform === "codechef" &&
            (host === "codechef.com" || host === "www.codechef.com")
        ) {
            const index = parts.indexOf("users");
            return index >= 0 ? (parts[index + 1] || "") : "";
        }

        return "";
    } catch {
        return "";
    }
}

function makeStat(title, value) {
    if (value == null || String(value).trim() === "") {
        return "";
    }

    return `<p><strong>${escapeHTML(title)}:</strong> ${escapeHTML(value)}</p>`;
}

async function getGitHubStats(profileURL) {
    const username = getUsername(profileURL, "github");

    if (!username) {
        return "<p>Enter a valid GitHub profile URL to load statistics.</p>";
    }

    try {
        const response = await fetch(
            `https://api.github.com/users/${encodeURIComponent(username)}`
        );

        if (!response.ok) throw new Error("GitHub request failed");

        const user = await response.json();

        let html = makeStat("Username", user.login);
        html += makeStat("Public Repositories", user.public_repos);
        html += makeStat("Followers", user.followers);

        try {
            const repoResponse = await fetch(
                `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=5`
            );

            if (repoResponse.ok) {
                const repos = await repoResponse.json();

                if (repos.length > 0) {
                    html += "<h3>Recently Updated Repositories</h3><ul>";

                    repos.forEach(repo => {
                        html += `
                            <li>
                                <a href="${escapeHTML(repo.html_url)}"
                                   target="_blank" rel="noopener noreferrer">
                                    ${escapeHTML(repo.name)}
                                </a>
                            </li>
                        `;
                    });

                    html += "</ul>";
                }
            }
        } catch {
            html += "<p class='stats-status'>Repository list unavailable.</p>";
        }

        return html;
    } catch {
        return "<p>GitHub statistics could not be loaded. Your resume is still available.</p>";
    }
}



async function getLeetCodeStats(profileURL) {
    const username = getUsername(profileURL, "leetcode");

    if (!username) {
        return "<p>Enter a valid LeetCode profile URL.</p>";
    }

    const base = "https://alfa-leetcode-api.onrender.com";

    try {
        const [solvedResponse, contestResponse] = await Promise.all([
            fetch(`${base}/${encodeURIComponent(username)}/solved`),
            fetch(`${base}/${encodeURIComponent(username)}/contest`)
        ]);

        let solved = {};
        let contest = {};

        if (solvedResponse.ok) {
            solved = await solvedResponse.json();
        }

        if (contestResponse.ok) {
            contest = await contestResponse.json();
        }

        let html = makeStat("Username", username);
        html += makeStat(
            "Total Problems Solved",
            solved.solvedProblem ?? solved.totalSolved
        );
        html += makeStat("Easy Solved", solved.easySolved);
        html += makeStat("Medium Solved", solved.mediumSolved);
        html += makeStat("Hard Solved", solved.hardSolved);
        
        const rating = contest.contestRating ?? contest.rating;

html += makeStat(
    "Contest Rating",
    rating == null ? null : Number(rating).toFixed(0)
);

        return html;
    } catch {
        return "<p>LeetCode statistics are temporarily unavailable.</p>";
    }
}





async function getCodeChefStats(profileURL) {
    const username = getUsername(profileURL, "codechef");

    if (!username) {
        return "<p>Enter a valid CodeChef profile URL.</p>";
    }

    const base = "https://codechef-stats.tashif.codes";

    try {
        const urls = [
            `${base}/${encodeURIComponent(username)}/profile`,
            `${base}/${encodeURIComponent(username)}/rating`,
            `${base}/${encodeURIComponent(username)}/contests`,
            `${base}/${encodeURIComponent(username)}/stats`
        ];

        const responses = await Promise.all(
            urls.map(url => fetch(url))
        );

        const results = await Promise.all(
            responses.map(async response =>
                response.ok ? await response.json() : {}
            )
        );

        const profile = results[0].data || {};
        const rating = results[1].data || {};
        const contests = results[2].data || {};
        const stats = results[3].data || {};

        let html = makeStat("Username", username);
        html += makeStat(
            "Current Rating",
            rating.currentRating ?? rating.current_rating
        );
        html += makeStat(
            "Highest Rating",
            rating.highestRating ?? rating.highest_rating
        );
        html += makeStat("Stars", profile.stars ?? contests.rank);
        html += makeStat(
            "Global Rank",
            contests.globalRanking ?? contests.globalRank
        );
        html += makeStat(
            "Problems Solved",
            stats.totalSolved
        );

        return html;
    } catch {
        return "<p>CodeChef statistics are temporarily unavailable.</p>";
    }
}


function addStatsSection(id, title) {
    return `
        <section class="resume-section" id="${id}">
            <h2>${title}</h2>
            <p class="stats-status">Loading statistics...</p>
        </section>
    `;
}

async function loadStats(elementId, getStats, profileURL) {
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
        const result = await getStats(profileURL);
        element.innerHTML = `<h2>${element.dataset.title}</h2>${result}`;
    } catch {
        element.innerHTML =
            `<h2>${element.dataset.title}</h2>` +
            "<p>Statistics are currently unavailable.</p>";
    }
}

form.addEventListener("submit", function (event) {
    event.preventDefault();

    if (!form.reportValidity()) return;

    const name = getValue("name");
    const email = getValue("email");
    const phone = getValue("phone");
    const education = getValue("education");
    const skills = getValue("skills");
    const experience = getValue("experience");
    const projects = getValue("projects");

    const github = getValue("github");
    const linkedin = getValue("linkedin");
    const leetcode = getValue("leetcode");
    const codechef = getValue("codechef");

    let resume = `
        <div class="resume-paper">
            <header class="resume-header">
                <h1>${escapeHTML(name)}</h1>
                ${email ? `<p>${escapeHTML(email)}</p>` : ""}
                ${phone ? `<p>${escapeHTML(phone)}</p>` : ""}
            </header>

            ${makeTextSection("Education", education)}
            ${makeTextSection("Skills", skills)}
            ${makeTextSection("Experience", experience)}
            ${makeTextSection("Projects", projects)}

            <section class="resume-section">
                <h2>Profile Links</h2>
                ${makeLink("GitHub", github)}
                ${makeLink("LinkedIn", linkedin)}
                ${makeLink("LeetCode", leetcode)}
                ${makeLink("CodeChef", codechef)}
            </section>
    `;

    if (github) resume += addStatsSection("githubStats", "GitHub Statistics");
    if (leetcode) resume += addStatsSection("leetcodeStats", "LeetCode Statistics");
    if (codechef) resume += addStatsSection("codechefStats", "CodeChef Statistics");

    resume += "</div>";

    resumeContent.innerHTML = resume;
    resumeOutput.hidden = false;

    const githubElement = document.getElementById("githubStats");
    const leetcodeElement = document.getElementById("leetcodeStats");
    const codechefElement = document.getElementById("codechefStats");

    if (githubElement) {
        githubElement.dataset.title = "GitHub Statistics";
        loadStats("githubStats", getGitHubStats, github);
    }

    if (leetcodeElement) {
        leetcodeElement.dataset.title = "LeetCode Statistics";
        loadStats("leetcodeStats", getLeetCodeStats, leetcode);
    }

    if (codechefElement) {
        codechefElement.dataset.title = "CodeChef Statistics";
        loadStats("codechefStats", getCodeChefStats, codechef);
    }

    resumeOutput.scrollIntoView({ behavior: "smooth" });
});

document.getElementById("editButton").addEventListener("click", function () {
    form.scrollIntoView({ behavior: "smooth" });
});

document.getElementById("printButton").addEventListener("click", function () {
    window.print();
});