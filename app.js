(function () {
  "use strict";

  var LICENSE_KEY = "stillDueLicense";

  function hasLicense() {
    var v = localStorage.getItem(LICENSE_KEY);
    return !!(v && String(v).trim());
  }

  (function captureLicense() {
    var params = new URLSearchParams(window.location.search);
    var q = params.get("license");
    if (q && String(q).trim()) {
      localStorage.setItem(LICENSE_KEY, String(q).trim());
    }
  })();

  (function markLicensed() {
    if (!hasLicense()) return;
    var note = document.getElementById("checkout-note");
    var btn = document.getElementById("checkout-btn");
    if (note) note.textContent = "Licensed. PDFs download without the free-version line.";
    if (btn) {
      btn.textContent = "You're in";
      btn.setAttribute("href", "#tool");
    }
  })();

  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var sel = btn.getAttribute("data-copy");
      var el = sel ? document.querySelector(sel) : null;
      if (!el) return;
      var text = (el.innerText || el.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
      copyText(text).then(function () {
        var old = btn.textContent;
        btn.textContent = "Copied";
        setTimeout(function () {
          btn.textContent = old;
        }, 1600);
      });
    });
  });

  var form = document.getElementById("due-form");
  if (!form) return;

  var dateInput = form.elements.date;
  if (dateInput && !dateInput.value) {
    var now = new Date();
    var m = String(now.getMonth() + 1).padStart(2, "0");
    var d = String(now.getDate()).padStart(2, "0");
    dateInput.value = now.getFullYear() + "-" + m + "-" + d;
  }

  var daysTouched = false;

  function money(n) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(n);
  }

  function num(name) {
    var el = form.elements[name];
    if (!el) return null;
    var raw = el.value;
    if (raw === "" || raw == null) return null;
    var v = parseFloat(raw);
    return Number.isFinite(v) ? v : null;
  }

  function val(name) {
    var el = form.elements[name];
    if (!el) return "";
    return String(el.value || "").trim();
  }

  function parseIso(iso) {
    if (!iso) return null;
    var parts = iso.split("-").map(Number);
    if (parts.length < 3 || !parts[0]) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function formatDate(iso) {
    var dt = parseIso(iso);
    if (!dt) return "";
    return dt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  function daysLateFromDue() {
    var due = parseIso(val("dueDate"));
    var today = parseIso(val("date")) || new Date();
    if (!due) return null;
    var a = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    var b = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    return Math.round((a - b) / 86400000);
  }

  function daysLabel(n) {
    if (n == null) return "past due";
    if (n === 1) return "1 day past due";
    if (n === 0) return "due today";
    if (n < 0) {
      var ahead = Math.abs(n);
      return ahead === 1 ? "due in 1 day" : "due in " + ahead + " days";
    }
    return n + " days past due";
  }

  function invoiceLabel(num) {
    return num ? "invoice " + num : "the invoice";
  }

  function invoiceTitle(num) {
    return num ? "Invoice " + num : "Invoice";
  }

  function stageLabel(stage) {
    if (stage === "second") return "Second reminder";
    if (stage === "last") return "Last polite reminder";
    return "First reminder";
  }

  function gather() {
    var amount = num("amount");
    var days = num("daysLate");
    if (days == null) days = daysLateFromDue();
    return {
      fromName: val("fromName") || "[Your name]",
      client: val("clientName") || "[Client]",
      project: val("projectName") || "[Project]",
      invoiceNumber: val("invoiceNumber"),
      amount: amount,
      amountLabel: amount != null ? money(amount) : "[Amount]",
      daysLate: days,
      daysLabel: daysLabel(days),
      invoiceDate: formatDate(val("invoiceDate")),
      dueDate: formatDate(val("dueDate")),
      payHow: val("payHow") || "[How to pay]",
      stage: form.elements.stage.value,
      tone: form.elements.tone.value,
      date: formatDate(val("date"))
    };
  }

  function buildEmail(data) {
    var inv = invoiceLabel(data.invoiceNumber);
    var invTitle = invoiceTitle(data.invoiceNumber);
    var dueBit = data.dueDate ? " It was due " + data.dueDate + "." : "";
    var lateBit = data.daysLate == null ? "It is past due." : "It is " + data.daysLabel + ".";
    var pay = "You can pay by " + data.payHow + ".";
    var subject;
    var body;

    if (data.stage === "last") {
      if (data.tone === "firm") {
        subject = invTitle + " for " + data.project + " is still open";
        body = [
          "Hi " + data.client + ",",
          "",
          "I am writing again about " + inv + " for " + data.project + "." + dueBit,
          lateBit + " Amount due: " + data.amountLabel + ".",
          "",
          pay,
          "",
          "I would like to close this out. Please send payment, or reply if you need a different date.",
          "This is a payment reminder from me, not a collections action.",
          "",
          data.fromName
        ].join("\n");
      } else {
        subject = invTitle + " for " + data.project + " is still open";
        body = [
          "Hi " + data.client + ",",
          "",
          "Checking in once more on " + inv + " for " + data.project + "." + dueBit,
          lateBit + " Amount due: " + data.amountLabel + ".",
          "",
          pay,
          "",
          "If something is in the way, reply and we can find a date. I would like to close the invoice.",
          "This is a polite reminder, not a collections notice.",
          "",
          "Thanks,",
          data.fromName
        ].join("\n");
      }
    } else if (data.stage === "second") {
      if (data.tone === "firm") {
        subject = "Following up on " + invTitle + " for " + data.project;
        body = [
          "Hi " + data.client + ",",
          "",
          "A short follow-up on " + inv + " for " + data.project + "." + dueBit,
          lateBit + " The amount is " + data.amountLabel + ".",
          "",
          pay,
          "",
          "Please send payment when you can this week. If a question is holding this, reply and I will sort it.",
          "",
          "Thanks,",
          data.fromName
        ].join("\n");
      } else {
        subject = "Following up on " + invTitle + " for " + data.project;
        body = [
          "Hi " + data.client + ",",
          "",
          "Hope you are well. A short follow-up on " + inv + " for " + data.project + "." + dueBit,
          lateBit + " The amount is " + data.amountLabel + ".",
          "",
          pay,
          "",
          "Happy to resend the invoice or answer a question. Thank you for taking care of this when you can.",
          "",
          "Thanks,",
          data.fromName
        ].join("\n");
      }
    } else {
      if (data.tone === "firm") {
        subject = invTitle + " for " + data.project;
        body = [
          "Hi " + data.client + ",",
          "",
          "I am checking in on " + inv + " for " + data.project + "." + dueBit,
          lateBit + " Amount due: " + data.amountLabel + ".",
          "",
          pay,
          "",
          "Please send payment at your earliest convenience, or reply if you need the invoice again.",
          "",
          data.fromName
        ].join("\n");
      } else {
        subject = invTitle + " for " + data.project;
        body = [
          "Hi " + data.client + ",",
          "",
          "Hope you are well. I am checking in on " + inv + " for " + data.project + "." + dueBit,
          lateBit + " Amount due: " + data.amountLabel + ".",
          "",
          pay,
          "",
          "Happy to resend the invoice or answer a question. Thank you,",
          data.fromName
        ].join("\n");
      }
    }

    return { subject: subject, body: body };
  }

  function el(id) {
    return document.getElementById(id);
  }

  function render() {
    var data = gather();
    var email = buildEmail(data);
    el("notice-kicker").textContent = stageLabel(data.stage);
    el("notice-amount").textContent = data.amountLabel;
    el("notice-late").textContent = data.daysLate == null ? "Add days late or a due date" : data.daysLabel;
    el("preview-subject").textContent = "Subject: " + email.subject;
    el("preview-body").textContent = email.body;
  }

  function hint(msg) {
    el("action-hint").textContent = msg;
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () {
        return fallbackCopy(text);
      });
    }
    return fallbackCopy(text);
  }

  function fallbackCopy(text) {
    return new Promise(function (resolve) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch (e) {}
      ta.remove();
      resolve();
    });
  }

  function syncDaysFromDue() {
    if (daysTouched) return;
    var auto = daysLateFromDue();
    if (auto == null) return;
    form.elements.daysLate.value = String(Math.max(0, auto));
  }

  form.addEventListener("input", function (e) {
    if (e.target && e.target.name === "daysLate") daysTouched = true;
    if (e.target && (e.target.name === "dueDate" || e.target.name === "date")) {
      syncDaysFromDue();
    }
    render();
  });
  form.addEventListener("change", function (e) {
    if (e.target && (e.target.name === "dueDate" || e.target.name === "date")) {
      syncDaysFromDue();
    }
    render();
  });

  el("fill-example").addEventListener("click", function () {
    form.elements.fromName.value = "Lumen Studio";
    form.elements.clientName.value = "Calder Goods";
    form.elements.projectName.value = "Brand site";
    form.elements.invoiceNumber.value = "1042";
    form.elements.amount.value = "4800";
    form.elements.payHow.value = "The original invoice, or ACH to the account on file";
    form.querySelector('input[name="stage"][value="first"]').checked = true;
    form.querySelector('input[name="tone"][value="firm"]').checked = true;
    var today = parseIso(val("date")) || new Date();
    var inv = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 28);
    var due = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 14);
    function iso(dt) {
      var m = String(dt.getMonth() + 1).padStart(2, "0");
      var d = String(dt.getDate()).padStart(2, "0");
      return dt.getFullYear() + "-" + m + "-" + d;
    }
    form.elements.invoiceDate.value = iso(inv);
    form.elements.dueDate.value = iso(due);
    daysTouched = false;
    syncDaysFromDue();
    render();
    hint("Example loaded. Copy the email or download the PDF.");
  });

  el("copy-email").addEventListener("click", function () {
    var data = gather();
    var email = buildEmail(data);
    var text = "Subject: " + email.subject + "\n\n" + email.body;
    copyText(text).then(function () {
      hint("Copied. Paste it into your mail app.");
    });
  });

  el("download-pdf").addEventListener("click", function () {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      hint("PDF library did not load. Check your connection and try again.");
      return;
    }
    if (!val("fromName") || !val("clientName") || !val("projectName") || !val("payHow")) {
      hint("Fill name, client, project, and how to pay first.");
      return;
    }
    if (num("amount") == null) {
      hint("Add the amount due so the reminder has a number.");
      return;
    }
    var days = num("daysLate");
    if (days == null) days = daysLateFromDue();
    if (days == null) {
      hint("Add days late or a due date.");
      return;
    }
    makePdf(gather());
    hint(hasLicense() ? "PDF downloaded." : "PDF downloaded. Free version includes a small footer line.");
  });

  function makePdf(data) {
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ unit: "pt", format: "letter" });
    var pageW = 612;
    var pageH = 792;
    var margin = 54;
    var width = pageW - margin * 2;
    var y = 50;
    var ink = [27, 23, 20];
    var muted = [111, 103, 94];
    var accent = [196, 53, 30];
    var rule = [212, 203, 189];
    var paper = [243, 238, 228];
    var footerTop = pageH - 56;
    var contentBottom = footerTop - 36;

    function setInk() {
      doc.setTextColor(ink[0], ink[1], ink[2]);
    }
    function setMuted() {
      doc.setTextColor(muted[0], muted[1], muted[2]);
    }

    doc.setFillColor(accent[0], accent[1], accent[2]);
    doc.rect(0, 0, 8, pageH, "F");

    doc.setFont("times", "italic");
    doc.setFontSize(11);
    setInk();
    doc.text("Still Due", margin, y);

    y += 16;
    doc.setDrawColor(accent[0], accent[1], accent[2]);
    doc.setLineWidth(1.2);
    doc.line(margin, y, margin + 34, y);

    y += 28;
    doc.setFont("times", "bold");
    doc.setFontSize(26);
    doc.text("Payment reminder", margin, y);

    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setMuted();
    doc.text(stageLabel(data.stage).toUpperCase() + "  ·  NOT A COLLECTIONS NOTICE", margin, y + 14);

    y += 28;
    doc.setDrawColor(ink[0], ink[1], ink[2]);
    doc.setLineWidth(0.7);
    doc.line(margin, y, margin + width, y);

    y += 18;
    doc.setFillColor(paper[0], paper[1], paper[2]);
    doc.rect(margin, y, width, 64, "F");
    doc.setFont("times", "italic");
    doc.setFontSize(28);
    setInk();
    doc.text(data.amountLabel, margin + 14, y + 38);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    setMuted();
    doc.text(data.daysLabel, margin + 14, y + 54);
    y += 84;

    var meta = [
      ["Date", data.date || ""],
      ["From", data.fromName],
      ["To", data.client],
      ["Project", data.project]
    ];
    if (data.invoiceNumber) meta.push(["Invoice", data.invoiceNumber]);
    if (data.invoiceDate) meta.push(["Invoice date", data.invoiceDate]);
    if (data.dueDate) meta.push(["Due date", data.dueDate]);

    var colGap = 16;
    var colW = (width - colGap) / 2;
    var leftY = y;
    var rightY = y;
    meta.forEach(function (row, i) {
      var useLeft = i % 2 === 0;
      var x = useLeft ? margin : margin + colW + colGap;
      var yy = useLeft ? leftY : rightY;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      setMuted();
      doc.text(row[0].toUpperCase(), x, yy);
      doc.setFont("times", "normal");
      doc.setFontSize(11);
      setInk();
      var lines = doc.splitTextToSize(String(row[1]), colW);
      doc.text(lines, x, yy + 13);
      var next = yy + Math.max(28, lines.length * 13 + 16);
      if (useLeft) leftY = next;
      else rightY = next;
    });
    y = Math.max(leftY, rightY) + 4;

    doc.setDrawColor(rule[0], rule[1], rule[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + width, y);
    y += 22;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    setMuted();
    doc.text("HOW TO PAY", margin, y);
    y += 14;
    doc.setFont("times", "normal");
    doc.setFontSize(11);
    setInk();
    var payLines = doc.splitTextToSize(data.payHow, width);
    doc.text(payLines, margin, y);
    y += payLines.length * 14 + 16;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    setMuted();
    doc.text("NOTE", margin, y);
    y += 14;
    doc.setFont("times", "normal");
    doc.setFontSize(11);
    setInk();
    var note = "This is a payment reminder for work already delivered. It is not a collections notice, not a demand letter, and not legal advice.";
    var noteLines = doc.splitTextToSize(note, width);
    if (y + noteLines.length * 14 < contentBottom) {
      doc.text(noteLines, margin, y);
      y += noteLines.length * 14 + 16;
    }

    var email = buildEmail(data);
    doc.setFont("times", "italic");
    doc.setFontSize(11);
    var ask = "Please send " + data.amountLabel + " when you can, or reply if you need a different date.";
    var askLines = doc.splitTextToSize(ask, width);
    if (y + askLines.length * 14 < contentBottom) {
      doc.text(askLines, margin, y);
    }

    doc.setDrawColor(rule[0], rule[1], rule[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, footerTop, margin + width, footerTop);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setMuted();
    var footer = "Generated by Still Due. A business document helper, not legal advice, not a collections agency. Built by an AI agent.";
    if (!hasLicense()) {
      footer += " Created with the free version of Still Due.";
    }
    doc.text(doc.splitTextToSize(footer, width), margin, footerTop + 14);

    var safe = String(data.project || "invoice")
      .replace(/[^\w]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "invoice";
    var invSafe = data.invoiceNumber ? String(data.invoiceNumber).replace(/[^\w]+/g, "-") : "reminder";
    doc.save("payment-reminder-" + invSafe + "-" + safe + ".pdf");
  }

  render();
})();
