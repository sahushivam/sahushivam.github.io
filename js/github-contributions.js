(function () {
  "use strict";

  const DAY = 24 * 60 * 60 * 1000;
  const API = "https://github-contributions-api.jogruber.de/v4/";
  const SVG_NS = "http://www.w3.org/2000/svg";
  const dateFormat = new Intl.DateTimeFormat("en", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC"
  });

  function normalizeContributions(data) {
    if (!data || !Array.isArray(data.contributions) ||
        !data.contributions.length || data.contributions.length > 371) {
      throw new Error("Contribution data is unavailable.");
    }

    const days = data.contributions.map(function (day) {
      if (!day || typeof day.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day.date) ||
          !Number.isSafeInteger(day.count) || day.count < 0 ||
          !Number.isInteger(day.level) || day.level < 0 || day.level > 4) {
        throw new Error("Invalid contribution data.");
      }
      const timestamp = Date.parse(day.date + "T00:00:00Z");
      if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== day.date) {
        throw new Error("Invalid contribution date.");
      }
      return { date: day.date, count: day.count, level: day.level, timestamp: timestamp };
    }).sort(function (a, b) { return a.timestamp - b.timestamp; });

    days.forEach(function (day, index) {
      if (index && day.timestamp - days[index - 1].timestamp !== DAY) {
        throw new Error("Incomplete contribution data.");
      }
    });
    return days;
  }

  // Public, CORS-enabled API; no GitHub credentials are sent to the browser.
  // Schema and cache policy: github.com/grubersjoe/github-contributions-api
  async function fetchContributions(username, fetchData = fetch, timeout = 10000) {
    if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username)) {
      throw new Error("Invalid GitHub username.");
    }
    const controller = new AbortController();
    const timer = setTimeout(function () { controller.abort(); }, timeout);
    try {
      const response = await fetchData(API + encodeURIComponent(username) + "?y=last", {
        signal: controller.signal,
        credentials: "omit"
      });
      if (!response.ok) throw new Error("Contribution request failed.");
      return normalizeContributions(await response.json());
    } finally {
      clearTimeout(timer);
    }
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function svgElement(tag, attributes, text) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.keys(attributes).forEach(function (key) { node.setAttribute(key, attributes[key]); });
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderChart(container, days, total) {
    const startDay = new Date(days[0].timestamp).getUTCDay();
    const weeks = Math.ceil((startDay + days.length) / 7);
    const width = 32 + weeks * 14;
    const range = dateFormat.format(days[0].timestamp) + " – " + dateFormat.format(days[days.length - 1].timestamp);
    const scroller = element("div", "github-contributions-scroll");
    scroller.tabIndex = 0;
    scroller.setAttribute("role", "region");
    scroller.setAttribute("aria-label", "GitHub contribution chart; scroll horizontally on small screens");
    const svg = svgElement("svg", {
      viewBox: "0 0 " + width + " 125", role: "img",
      "aria-label": total + " GitHub contributions, " + range,
      class: "github-contributions-grid"
    });

    ["Mon", "Wed", "Fri"].forEach(function (label, index) {
      svg.appendChild(svgElement("text", { x: 0, y: 42 + index * 28 }, label));
    });
    let lastLabelWeek = -4;
    days.forEach(function (day, index) {
      const date = new Date(day.timestamp);
      const week = Math.floor((startDay + index) / 7);
      if ((index === 0 || date.getUTCDate() === 1) && week - lastLabelWeek >= 3 && week < weeks - 1) {
        svg.appendChild(svgElement("text", { x: 32 + week * 14, y: 12 },
          date.toLocaleDateString("en", { month: "short", timeZone: "UTC" })));
        lastLabelWeek = week;
      }
      const cell = svgElement("rect", {
        x: 32 + week * 14, y: 22 + date.getUTCDay() * 14,
        width: 11, height: 11, rx: 2, class: "github-level-" + day.level
      });
      cell.appendChild(svgElement("title", {}, day.count + " " +
        (day.count === 1 ? "contribution" : "contributions") + " on " + dateFormat.format(date)));
      svg.appendChild(cell);
    });
    scroller.appendChild(svg);
    container.appendChild(scroller);

    const footer = element("div", "github-contributions-footer");
    footer.appendChild(element("span", "github-contributions-range", range));
    const legend = element("span", "github-contributions-legend", "Less");
    legend.setAttribute("aria-hidden", "true");
    for (let level = 0; level <= 4; level++) {
      legend.appendChild(element("span", "github-level-" + level));
    }
    legend.appendChild(document.createTextNode("More"));
    footer.appendChild(legend);
    container.appendChild(footer);

    const details = element("details", "github-contributions-details");
    details.appendChild(element("summary", "", "View daily contribution counts"));
    const activeDays = days.filter(function (day) { return day.count > 0; });
    if (!activeDays.length) {
      details.appendChild(element("p", "", "No contributions in this period."));
    } else {
      const table = element("table");
      table.appendChild(element("caption", "", "Days with contributions; all other days in this period have zero contributions."));
      const head = element("thead");
      const headings = element("tr");
      ["Date", "Contributions"].forEach(function (label) {
        const heading = element("th", "", label);
        heading.scope = "col";
        headings.appendChild(heading);
      });
      head.appendChild(headings);
      table.appendChild(head);
      const body = element("tbody");
      activeDays.slice().reverse().forEach(function (day) {
        const row = element("tr");
        row.appendChild(element("td", "", dateFormat.format(day.timestamp)));
        row.appendChild(element("td", "", day.count.toLocaleString("en")));
        body.appendChild(row);
      });
      table.appendChild(body);
      details.appendChild(table);
    }
    container.appendChild(details);
    scroller.scrollLeft = scroller.scrollWidth;
  }

  async function loadChart(root) {
    const status = root.querySelector(".github-contributions-status");
    const chart = root.querySelector(".github-contributions-chart");
    if (!status || !chart) return;
    chart.replaceChildren();
    root.setAttribute("aria-busy", "true");
    status.textContent = "Loading GitHub contributions…";
    try {
      const days = await fetchContributions(root.dataset.githubUser);
      const total = days.reduce(function (sum, day) { return sum + day.count; }, 0);
      renderChart(chart, days, total);
      status.textContent = total.toLocaleString("en") + " " +
        (total === 1 ? "contribution" : "contributions") + " in the last year";
    } catch (error) {
      status.textContent = "The contribution chart is temporarily unavailable. You can still view my activity on GitHub.";
      const retry = element("button", "github-contributions-retry", "Try again");
      retry.type = "button";
      retry.addEventListener("click", function () { loadChart(root); });
      chart.appendChild(retry);
    } finally {
      root.setAttribute("aria-busy", "false");
    }
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { normalizeContributions: normalizeContributions, fetchContributions: fetchContributions };
  }
  if (typeof document !== "undefined") {
    document.querySelectorAll("[data-github-user]").forEach(loadChart);
  }
}());
