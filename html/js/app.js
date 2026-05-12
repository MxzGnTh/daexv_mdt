(function () {
  "use strict";

  const RESOURCE_NAME =
    typeof GetParentResourceName === "function"
      ? GetParentResourceName()
      : "Daexv_mdt";
  const IS_RUNTIME = typeof GetParentResourceName === "function";

  const CALLBACK_ENDPOINTS = new Set([
    "searchIndividuals",
    "getIndividual",
    "getCharges",
    "getWantedList",
    "getGangs",
    "getGang",
    "getCases",
    "getCase",
    "getDashboardStats",
    "getRecentActivity",
    "getInbox",
    "getOutbox",
    "getOfficersList",
    "getFines",
    "getFinePresets",
    "getAllFines",
    "getFineStats",
  ]);


  const ES = {
    tabs: ["Ciudadanos", "Archivo", "Buscados", "Bandas", "Panel", "Linea de Avisos"],
    statuses: { clear: "LIMPIO", wanted: "BUSCADO", dangerous: "PELIGROSO", deceased: "FALLECIDO", missing: "DESAPARECIDO", archived: "ARCHIVADO", pending: "PENDIENTE", overdue: "VENCIDA", paid: "PAGADA", cancelled: "CANCELADA", waived: "PERDONADA", open: "Abierto", ongoing: "En curso", complete: "Completo" },
    caseTypes: { case_file: "Expediente", arrest_report: "Reporte de Arresto", arrest_warrant: "Orden de Arresto", medical_report: "Reporte Medico", citation: "Citacion", incident: "Reporte de Incidente" },
  };
  function labelStatus(value) { const key = String(value || "").toLowerCase(); return ES.statuses[key] || safeText(value, "-"); }
  function labelCaseType(value) { const key = String(value || "").toLowerCase(); return ES.caseTypes[key] || safeText(String(value || "").replace(/_/g, " "), "-"); }
  const state = {
    open: false,
    demo: !IS_RUNTIME,
    tab: "citizens",
    player: {
      name: "Peter Walsh",
      rank: "marshal",
      level: 3,
      identifier: "demo-001",
    },
    serverName: "Monroe Sheriff's Office",
    departmentSeal: "MSO",
    penalCode: {},
    caseTypes: [],
    caseStates: [],
    citizens: [],
    citizensFiltered: [],
    filings: [],
    filingPage: 1,
    filingTotal: 0,
    filingMode: "cases",
    wanted: [],
    gangs: [],
    currentCitizen: null,
    currentCase: null,
    currentCitizenFines: [],
    finePage: 1,
    fineTotal: 0,
    finePresets: [],
    telegramMode: "inbox",
    telegramRows: [],
  };

  const demo = {
    citizens: [
      {
        id: 1,
        identifier: "cit-001",
        firstname: "Austin",
        lastname: "Wallace",
        aliases: "Hooter, Austin",
        affiliations: "The Wallace Gang",
        description:
          "Austin Wallace, the enigmatic and cunning leader of the notorious Wallace Gang.",
        image_url: "",
        status: "wanted",
        telegram: "HOOTER",
        notes: "Known to move between Shady Belle and Saint Denis.",
        known_associates: "Bobby Buchanan",
      },
      {
        id: 2,
        identifier: "cit-002",
        firstname: "James",
        lastname: "Butcher",
        aliases: "Jim",
        affiliations: "The Butcher Gang",
        description:
          "Jim Butcher, the notorious outlaw and mastermind behind the infamous Butcher Gang.",
        image_url: "",
        status: "wanted",
        telegram: "JIMB",
        notes: "Current whereabouts unknown.",
        known_associates: "Nora Whitlock",
      },
      {
        id: 3,
        identifier: "cit-003",
        firstname: "Alexander",
        lastname: "Drake",
        aliases: "King of Liberatalia",
        affiliations: "None",
        description:
          "Formerly known as the King of the pirates of Liberatalia.",
        image_url: "",
        status: "dangerous",
        telegram: "",
        notes: "Approach with caution.",
        known_associates: "",
      },
      {
        id: 4,
        identifier: "cit-004",
        firstname: "Charles",
        lastname: "Scott",
        aliases: "",
        affiliations: "Scarlett Outfit",
        description:
          "Charles Scott is the leader of a criminal group operating out of Scarlett Ranch.",
        image_url: "",
        status: "clear",
        telegram: "",
        notes: "Under watch.",
        known_associates: "",
      },
      {
        id: 5,
        identifier: "cit-005",
        firstname: "Luciano",
        lastname: "De Luca",
        aliases: "",
        affiliations: "Saint Denis Circle",
        description:
          "Luciano is believed to be head of a criminal organization in Saint Denis.",
        image_url: "",
        status: "dangerous",
        telegram: "",
        notes: "Seen near docks.",
        known_associates: "Vito Romano",
      },
    ],
    wanted: [
      {
        id: 11,
        individual_id: 1,
        firstname: "Austin",
        lastname: "Wallace",
        aliases: "Hooter",
        title: "Orden de Arresto - Austin Wallace",
        charges: "CP-202 Armed Robbery",
        reason: "Multiple stagecoach robberies.",
        danger_level: "high",
        bounty: 450,
        status: "active",
        created_at: "1899-01-26 16:06",
      },
      {
        id: 12,
        individual_id: 2,
        firstname: "James",
        lastname: "Butcher",
        aliases: "Jim",
        title: "Orden de Arresto - Jim Butcher",
        charges: "CP-404 Assault with Deadly Weapon",
        reason: "Witness statements and evidence filed.",
        danger_level: "extreme",
        bounty: 650,
        status: "pending",
        created_at: "1899-01-28 12:39",
      },
      {
        id: 13,
        individual_id: 3,
        firstname: "Alexander",
        lastname: "Drake",
        aliases: "",
        title: "Questioning Warrant",
        charges: "CP-310 Perjury",
        reason: "Failed court testimony.",
        danger_level: "medium",
        bounty: 120,
        status: "active",
        created_at: "1899-01-29 09:15",
      },
    ],
    gangs: [
      {
        id: 1,
        name: "Wallace Gang",
        alias: "Wallace Boys",
        territory: "Shady Belle",
        threat_level: "high",
        status: "active",
        description: "Armed and mobile.",
        member_count: 8,
      },
      {
        id: 2,
        name: "Butcher Gang",
        alias: "Butchers",
        territory: "New Austin",
        threat_level: "extreme",
        status: "active",
        description: "Known for violent raids.",
        member_count: 6,
      },
      {
        id: 3,
        name: "Scarlett Outfit",
        alias: "Scarlett",
        territory: "Scarlett Meadows",
        threat_level: "medium",
        status: "active",
        description: "Smuggling and extortion.",
        member_count: 10,
      },
      {
        id: 4,
        name: "Saint Denis Circle",
        alias: "The Circle",
        territory: "Saint Denis",
        threat_level: "high",
        status: "unknown",
        description: "Urban crime network.",
        member_count: 12,
      },
    ],
    filings: [
      {
        id: 101,
        title: "#33032 Austin Wallace: Shooting",
        case_type: "arrest_report",
        state: "open",
        summary:
          "Shooting at Rhodes rail yard. Witness confirms suspect identity.",
        content:
          "Arrest report filed by Peter Walsh. Mentioned citizens: Austin Wallace and Bobby Buchanan.",
        citizen_id: 1,
        citizen_name: "Austin Wallace",
        updated_at: "1899-01-28 16:06",
        created_at: "1899-01-28 16:06",
      },
      {
        id: 102,
        title: "Reporte Medico: Jim Butcher",
        case_type: "medical_report",
        state: "complete",
        summary: "Medical examination after altercation.",
        content: "Physician statement and injury log included.",
        citizen_id: 2,
        citizen_name: "James Butcher",
        updated_at: "1899-01-29 11:20",
        created_at: "1899-01-29 10:45",
      },
      {
        id: 103,
        title: "Incidente Report: Scarlett Ranch",
        case_type: "incident",
        state: "ongoing",
        summary: "Night raid and property damage.",
        content: "Multiple tracks found at scene. Evidence pending.",
        citizen_id: 4,
        citizen_name: "Charles Scott",
        updated_at: "1899-01-30 08:15",
        created_at: "1899-01-30 08:00",
      },
      {
        id: 104,
        title: "Citation: Disorderly Conduct",
        case_type: "citation",
        state: "complete",
        summary: "Public disturbance in Valentine.",
        content: "Citation paid on site.",
        citizen_id: 5,
        citizen_name: "Luciano De Luca",
        updated_at: "1899-01-30 13:10",
        created_at: "1899-01-30 13:00",
      },
      {
        id: 105,
        title: "Expediente: Roanoke Riders",
        case_type: "case_file",
        state: "open",
        summary: "Organization surveillance and active leads.",
        content: "Gang dossier with member links.",
        citizen_id: null,
        citizen_name: "",
        updated_at: "1899-01-31 09:45",
        created_at: "1899-01-31 09:45",
      },
    ],
    activity: [
      {
        officer_name: "Peter Walsh",
        action: "created case",
        target_type: "case",
        details: "Case #33032 filed",
        created_at: "1899-01-31 09:45",
      },
      {
        officer_name: "Marshal Reed",
        action: "signed warrant",
        target_type: "warrant",
        details: "Jim Butcher",
        created_at: "1899-01-31 08:10",
      },
      {
        officer_name: "Deputy Cole",
        action: "updated individual",
        target_type: "individual",
        details: "Luciano De Luca",
        created_at: "1899-01-30 22:14",
      },
    ],
    telegramsInbox: [
      {
        id: 1,
        from_name: "Marshal Reed",
        to_name: "Peter Walsh",
        subject: "Judge signature",
        body: "Need review on warrant #12 before noon.",
        urgent: 1,
        created_at: "1899-01-31 07:42",
        read_at: null,
      },
      {
        id: 2,
        from_name: "Deputy Cole",
        to_name: "Peter Walsh",
        subject: "Witness waiting",
        body: "Witness from Scarlett Ranch at front desk.",
        urgent: 0,
        created_at: "1899-01-30 20:10",
        read_at: "1899-01-30 20:30",
      },
    ],
    telegramsOutbox: [
      {
        id: 3,
        from_name: "Peter Walsh",
        to_name: "Sheriff Monroe",
        subject: "Night patrol summary",
        body: "Two stops made. No arrests.",
        urgent: 0,
        created_at: "1899-01-30 23:01",
        read_at: null,
      },
    ],
    fines: [
      {
        id: 41,
        individual_id: 1,
        citizen_identifier: "cit-001",
        citizen_name: "Austin Wallace",
        charge: "Assault",
        penal_code: "CP-104",
        category: "PERSONS",
        amount: 100,
        status: "pending",
        officer_name: "Peter Walsh",
        created_at: "1899-01-30 10:22",
      },
      {
        id: 42,
        individual_id: 2,
        citizen_identifier: "cit-002",
        citizen_name: "James Butcher",
        charge: "Disorderly Conduct",
        penal_code: "CP-301",
        category: "ORDER",
        amount: 25,
        status: "overdue",
        officer_name: "Deputy Cole",
        created_at: "1899-01-29 08:30",
      },
      {
        id: 43,
        individual_id: 3,
        citizen_identifier: "cit-003",
        citizen_name: "Alexander Drake",
        charge: "Vandalism",
        penal_code: "CP-207",
        category: "PROPERTY",
        amount: 75,
        status: "paid",
        officer_name: "Marshal Reed",
        created_at: "1899-01-28 18:40",
      },
    ],
    finePresets: [
      { id: 1, penal_code: "CP-104", charge: "Assault", category: "PERSONS", amount: 100, description: "Physical assault against another person" },
      { id: 2, penal_code: "CP-301", charge: "Disorderly Conduct", category: "ORDER", amount: 25, description: "Disruptive behavior in public" },
      { id: 3, penal_code: "CP-207", charge: "Vandalism", category: "PROPERTY", amount: 75, description: "Willful destruction of property" },
    ],
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(
      /[&<>"']/g,
      (char) =>
        (
          {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          }[char]
        )
    );
  }

  function safeText(value, fallback) {
    const txt = String(value == null ? "" : value).trim();
    return txt === "" ? fallback || "-" : txt;
  }

  function formatDate(value) {
    if (!value) return "-";
    return String(value).replace("T", " ").substring(0, 16);
  }

  function notify(message) {
    if (!message) return;
    const old = byId("mdt-toast");
    if (old) old.remove();
    const toast = document.createElement("div");
    toast.id = "mdt-toast";
    toast.style.cssText =
      "position:fixed;left:50%;bottom:20px;transform:translateX(-50%);background:#2c1a0e;color:#f2e8d0;border:1px solid #c4a878;padding:8px 14px;z-index:9999;font:600 13px 'Crimson Text',serif;";
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2600);
  }


  function closeModalLayer() { const layer = byId("modal-layer"); if (layer) layer.remove(); }
  function modalForm(options = {}) {
    closeModalLayer();
    return new Promise((resolve) => {
      const layer = document.createElement("div"); layer.id = "modal-layer"; layer.className = "modal-layer";
      const fields = options.fields || [];
      layer.innerHTML = `<div class="modal-card"><div class="modal-title">${esc(options.title || "Formulario")}</div>${options.note ? `<div class="modal-note">${esc(options.note)}</div>` : ""}<form class="modal-grid" id="modal-form"></form><div class="modal-actions"><button class="secondary" type="button" id="modal-cancel">Cancelar</button><button class="${options.danger ? "danger" : ""}" type="button" id="modal-ok">${esc(options.okText || "Guardar")}</button></div></div>`;
      document.body.appendChild(layer); const form = byId("modal-form");
      fields.forEach((field) => {
        const wrap = document.createElement("div");
        wrap.className = "modal-field";
        const id = `mf-${field.name}`;
        let control = "";
        if (field.type === "textarea") {
          control = `<textarea id="${id}" data-name="${esc(field.name)}" placeholder="${esc(field.placeholder || "")}">${esc(field.value || "")}</textarea>`;
        } else if (field.type === "select") {
          const optionsHtml = (field.options || [])
            .map((opt) => {
              if (opt && Array.isArray(opt.options)) {
                const inner = opt.options
                  .map(
                    (child) =>
                      `<option value="${esc(child.value)}" ${String(child.value) === String(field.value || "") ? "selected" : ""}>${esc(child.label)}</option>`
                  )
                  .join("");
                return `<optgroup label="${esc(opt.label || "")}">${inner}</optgroup>`;
              }
              return `<option value="${esc(opt.value)}" ${String(opt.value) === String(field.value || "") ? "selected" : ""}>${esc(opt.label)}</option>`;
            })
            .join("");
          control = `<select id="${id}" data-name="${esc(field.name)}">${optionsHtml}</select>`;
        } else {
          control = `<input id="${id}" data-name="${esc(field.name)}" type="${esc(field.type || "text")}" value="${esc(field.value || "")}" placeholder="${esc(field.placeholder || "")}">`;
        }
        wrap.innerHTML = `<label for="${id}">${esc(field.label || field.name)}</label>${control}`;
        form.appendChild(wrap);
      });
      const finish = (value) => { closeModalLayer(); resolve(value); };
      byId("modal-cancel").onclick = () => finish(null); layer.addEventListener("click", (event) => { if (event.target === layer) finish(null); });
      byId("modal-ok").onclick = () => { const result = {}; fields.forEach((field) => { const el = form.querySelector(`[data-name="${field.name}"]`); result[field.name] = el ? el.value : ""; }); finish(result); };
      const first = form.querySelector("input,textarea,select"); if (first) first.focus();
    });
  }
  function modalConfirm(title, message, danger = false) { return modalForm({ title, note: message, danger, okText: danger ? "Confirmar" : "Aceptar", fields: [] }).then((result) => result !== null); }
  function modalReason(title, label) { return modalForm({ title, okText: "Confirmar", fields: [{ name: "reason", label, type: "textarea" }] }).then((data) => data && String(data.reason || "").trim()); }
  function quickMenu(title, items) { closeModalLayer(); return new Promise((resolve) => { const layer = document.createElement("div"); layer.id = "modal-layer"; layer.className = "modal-layer"; layer.innerHTML = `<div><div style="color:#f2e8d0;text-align:center;margin-bottom:8px;font:700 18px 'Playfair Display',serif">${esc(title)}</div><div class="quick-menu"></div></div>`; const box = layer.querySelector(".quick-menu"); items.forEach((item) => { const btn = document.createElement("button"); btn.textContent = item.label; btn.onclick = () => { closeModalLayer(); resolve(item.value); }; box.appendChild(btn); }); layer.addEventListener("click", (event) => { if (event.target === layer) { closeModalLayer(); resolve(null); } }); document.body.appendChild(layer); }); }
  function callbackRequest(endpoint, payload = {}) {
    if (state.demo) return Promise.resolve(demoResponse(endpoint, payload));
    const cbId = Math.floor(Math.random() * 900000) + 100000;

    return new Promise((resolve, reject) => {
      const eventName = "cb_" + cbId;
      const timeout = setTimeout(() => {
        window.removeEventListener("message", handler);
        reject(new Error("Callback timeout: " + endpoint));
      }, 10000);

      function handler(event) {
        if (event.data && event.data.type === eventName) {
          clearTimeout(timeout);
          window.removeEventListener("message", handler);
          resolve(event.data.data);
        }
      }

      window.addEventListener("message", handler);
      fetch("https://" + RESOURCE_NAME + "/" + endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=UTF-8" },
        body: JSON.stringify({ ...payload, cbId }),
      }).catch((error) => {
        clearTimeout(timeout);
        window.removeEventListener("message", handler);
        reject(error);
      });
    });
  }

  function actionRequest(endpoint, payload = {}) {
    if (state.demo) return Promise.resolve({ ok: true });
    return fetch("https://" + RESOURCE_NAME + "/" + endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify(payload),
    }).then((response) => response.json().catch(() => ({ ok: true })));
  }

  function nuiFetch(endpoint, payload) {
    if (CALLBACK_ENDPOINTS.has(endpoint)) return callbackRequest(endpoint, payload);
    return actionRequest(endpoint, payload);
  }

  function demoResponse(endpoint, payload = {}) {
    if (endpoint === "searchIndividuals") {
      const q = String(payload.query || "").toLowerCase();
      return demo.citizens.filter((c) =>
        (c.firstname + " " + c.lastname + " " + (c.aliases || "") + " " + (c.affiliations || ""))
          .toLowerCase()
          .includes(q)
      );
    }

    if (endpoint === "getIndividual") {
      const id = Number(payload.id || payload.individualId || 0);
      const c = demo.citizens.find((row) => row.id === id) || demo.citizens[0];
      return {
        ...c,
        created_at: "1899-01-28 16:06",
        created_by_name: "Peter Walsh",
        updated_at: "1899-01-30 10:20",
        updated_by_name: "Peter Walsh",
        charges: [
          {
            id: 85,
            charge: "#33032 " + c.firstname + " " + c.lastname + ": Shooting",
            officer_name: "Peter Walsh",
            created_at: "1899-01-28 16:06",
            penal_code: "CP-202",
            fine: 350,
            sentence_time: 30,
            status: "open",
          },
        ],
        warrants: demo.wanted.filter(
          (w) => w.individual_id === c.id && (w.status === "active" || w.status === "pending")
        ),
        medical_refs: [
          {
            id: 91,
            doc_title: "Reporte Medico",
            doc_code: "INF-MED",
            issued_by: "Dr. Haines",
            issued_at: "1899-01-29 10:30",
          },
        ],
        legal_docs: [
          {
            id: 92,
            doc_title: "Reporte de Arresto",
            doc_code: "AR-144",
            section: "law",
            issued_by: "Peter Walsh",
            issued_at: "1899-01-28 16:06",
          },
        ],
        legal_refs: [],
      };
    }

    if (endpoint === "getCases") {
      const page = Number(payload.page || 1);
      const filters = payload.filters || {};
      const search = String(filters.search || "").toLowerCase();
      const caseType = String(filters.caseType || "").toLowerCase();
      const caseState = String(filters.state || "").toLowerCase();
      const rows = demo.filings.filter((f) => {
        if (search && !(f.title + " " + (f.summary || "") + " " + (f.citizen_name || "")).toLowerCase().includes(search))
          return false;
        if (caseType && caseType !== "all types" && f.case_type.toLowerCase() !== caseType) return false;
        if (caseState && caseState !== "all states" && f.state.toLowerCase() !== caseState) return false;
        return true;
      });
      return { cases: rows, totalCount: rows.length, page };
    }

    if (endpoint === "getCase") {
      const id = Number(payload.caseId || payload.id || 0);
      const row = demo.filings.find((c) => c.id === id) || demo.filings[0];
      return {
        ...row,
        incidents: [
          {
            id: 1,
            title: "Initial call",
            location: "Valentine",
            date: "1899-01-28 14:20",
            details: "Report arrived by telegram.",
          },
          {
            id: 2,
            title: "On scene response",
            location: "Rhodes rail yard",
            date: "1899-01-28 15:30",
            details: "Suspect fled eastbound.",
          },
        ],
        charges: [
          {
            id: 1,
            charge_name: "Armed Robbery",
            penal_code: "CP-202",
            category: "PROPERTY",
            sentence_time: 30,
            fine: 350,
          },
        ],
      };
    }

    if (endpoint === "getWantedList") return demo.wanted;
    if (endpoint === "getGangs") return demo.gangs;
    if (endpoint === "getGang") {
      const id = Number(payload.id || payload.gangId || 0);
      const row = demo.gangs.find((g) => g.id === id) || demo.gangs[0];
      const members = demo.citizens.slice(0, Math.max(2, Math.min(6, row.member_count || 2))).map((c, i) => ({
        id: i + 1,
        firstname: c.firstname,
        lastname: c.lastname,
        role: i === 0 ? "Leader" : "Member",
        individual_status: c.status,
      }));
      return { ...row, members };
    }
    if (endpoint === "getDashboardStats") {
      return {
        totalIndividuals: demo.citizens.length,
        wantedCount: demo.citizens.filter((c) => c.status === "wanted").length,
        activeWarrants: demo.wanted.filter((w) => w.status === "pending" || w.status === "active").length,
        openCargos: 6,
        gangCount: demo.gangs.length,
        weekActivity: demo.activity.length,
      };
    }
    if (endpoint === "getRecentActivity") return demo.activity;
    if (endpoint === "getInbox") return demo.telegramsInbox;
    if (endpoint === "getOutbox") return demo.telegramsOutbox;
    if (endpoint === "getFinePresets") return demo.finePresets;
    if (endpoint === "getFines") {
      const individualId = Number(payload.individualId || payload.individual_id || 0);
      return demo.fines
        .filter((f) => f.individual_id === individualId)
        .sort((a, b) => {
          const order = { overdue: 1, pending: 2, paid: 3, cancelled: 4, waived: 5 };
          return (order[a.status] || 9) - (order[b.status] || 9);
        });
    }
    if (endpoint === "getAllFines") {
      const page = Number(payload.page || 1);
      const filters = payload.filters || {};
      const search = String(filters.search || "").toLowerCase();
      const status = String(filters.status || "").toLowerCase();
      const rows = demo.fines.filter((f) => {
        const text = `${f.citizen_name} ${f.charge} ${f.penal_code} ${f.officer_name}`.toLowerCase();
        if (search && !text.includes(search)) return false;
        if (status && f.status !== status) return false;
        return true;
      });
      return { fines: rows, totalCount: rows.length, page };
    }
    if (endpoint === "getFineStats") return { totalCollected: 1250, totalPending: 320 };
    return [];
  }

  function statusBadge(status) {
    if (!status) return "";
    const s = String(status).toLowerCase();
    if (s === "wanted") return '<span class="badge">[WANTED]</span>';
    if (s === "dangerous")
      return '<span class="badge" style="color:#cc4400">[DANGEROUS]</span>';
    if (s === "missing")
      return '<span class="badge" style="color:#8a6a3a">[MISSING]</span>';
    if (s === "deceased")
      return '<span class="badge" style="color:#5a5a5a">[DECEASED]</span>';
    return "";
  }

  function fineEstadoBadge(status) {
    const s = String(status || "").toLowerCase();
    const map = {
      pending: { bg: "#cc8800", text: "PENDIENTE" },
      overdue: { bg: "#8b0000", text: "VENCIDA" },
      paid: { bg: "#2a5a2a", text: "PAGADA" },
      cancelled: { bg: "#666666", text: "CANCELADA" },
      waived: { bg: "#3a5a8a", text: "PERDONADA" },
    };
    const row = map[s] || { bg: "#8a6a3a", text: s.toUpperCase() || "DESCONOCIDO" };
    return `<span style="display:inline-block;padding:2px 6px;font-size:10px;border:1px solid ${row.bg};color:${row.bg};font-weight:700;letter-spacing:.04em">${row.text}</span>`;
  }

  function canManageFineAction(action) {
    const level = Number(state.player?.level || 0);
    if (action === "cancel") return level >= 2;
    if (action === "waive") return level >= 3;
    return false;
  }

  function isFineOpenEstado(status) {
    const s = String(status || "").toLowerCase();
    return s === "pending" || s === "overdue";
  }

  function ensureFinesLayout() {
    const profileRoot = byId("p-profile");
    if (profileRoot && !byId("pfines-wrap")) {
      const sec = document.createElement("div");
      sec.className = "sec";
      sec.id = "pfines-wrap";
      sec.innerHTML =
        '<div class="stit">Fines Registro</div>' +
        '<div id="pfines"></div>' +
        '<div id="pfines-outstanding" style="margin-top:6px;font-size:12px;color:#8b0000;font-weight:700"></div>';
      const notesSec = profileRoot.querySelectorAll(".sec");
      if (notesSec && notesSec.length) {
        notesSec[notesSec.length - 1].before(sec);
      } else {
        profileRoot.appendChild(sec);
      }
    }
    const actionRow = profileRoot ? profileRoot.querySelector(".abrow") : null;
    if (actionRow && !byId("p-issue-fine")) {
      const btn = document.createElement("button");
      btn.className = "abtn";
      btn.id = "p-issue-fine";
      btn.textContent = "Emitir Multa";
      actionRow.appendChild(btn);
    }

    const filingPanel = byId("p-filing");
    if (filingPanel && !byId("filing-mode-bar")) {
      const modeBar = document.createElement("div");
      modeBar.id = "filing-mode-bar";
      modeBar.style.cssText =
        "display:flex;gap:6px;padding:6px 16px;border-bottom:1px dashed #c4a878;";
      modeBar.innerHTML =
        '<button id="fm-cases" class="ss" style="font-weight:700">Expedientes</button>' +
        '<button id="fm-citations" class="ss">Citaciones</button>';
      const sbar = filingPanel.querySelector(".sbar");
      if (sbar) sbar.after(modeBar);
      const pager = filingPanel.querySelector("div[style*='Anterior']");
      if (pager) pager.id = "filing-pagination";
    }
  }

  function renderProfileFines(rows) {
    rows = Array.isArray(rows) ? rows : [];
    const wrap = byId("pfines");
    const out = byId("pfines-outstanding");
    if (!wrap || !out) return;

    const outstanding = rows
      .filter((f) => isFineOpenEstado(f.status))
      .reduce((sum, f) => sum + Number(f.amount || 0), 0);

    out.textContent = `Pendiente total: $${outstanding}`;

    if (!rows.length) {
      wrap.innerHTML = '<div class="empty">Sin multas registradas.</div>';
      return;
    }

    wrap.innerHTML =
      '<table class="rtable"><thead><tr><th>ID</th><th>Charge</th><th>Monto</th><th>Estado</th><th>Date</th><th>Acciones</th></tr></thead><tbody>' +
      rows
        .map((fine) => {
          const status = String(fine.status || "");
          const rowBg =
            status === "overdue"
              ? "background:rgba(139,0,0,.08);"
              : status === "pending"
              ? "background:rgba(204,136,0,.08);"
              : "";

          let actions = "-";
          if (isFineOpenEstado(status) && (canManageFineAction("cancel") || canManageFineAction("waive"))) {
            const opts = [];
            if (canManageFineAction("cancel"))
              opts.push(
                `<button class="ss" style="padding:2px 5px" onclick="cancelFineFromProfile(${Number(
                  fine.id || 0
                )})">Cancelar</button>`
              );
            if (canManageFineAction("waive"))
              opts.push(
                `<button class="ss" style="padding:2px 5px" onclick="waiveFineFromProfile(${Number(
                  fine.id || 0
                )})">Perdonar</button>`
              );
            actions = opts.join(" ");
          }

          return `<tr style="${rowBg}"><td class="rid">${esc(
            fine.id || ""
          )}</td><td>${esc(safeText(fine.charge, "-"))}</td><td>$${esc(
            fine.amount || 0
          )}</td><td>${fineEstadoBadge(status)}</td><td>${esc(
            formatDate(fine.created_at)
          )}</td><td>${actions}</td></tr>`;
        })
        .join("") +
      "</tbody></table>";
  }

  function panelIdByName(name) {
    return {
      citizens: "p-citizens",
      profile: "p-profile",
      filing: "p-filing",
      fdetail: "p-fdetail",
      wanted: "p-wanted",
      gangs: "p-gangs",
      dash: "p-dash",
      tg: "p-tg",
    }[name] || "p-citizens";
  }

  function setTabVisual(tabName) {
    const tabs = document.querySelectorAll(".rtab");
    tabs.forEach((tab) => tab.classList.remove("on"));
    const idx = { citizens: 0, filing: 1, wanted: 2, gangs: 3, dash: 4, tg: 5 }[tabName];
    if (idx != null && tabs[idx]) tabs[idx].classList.add("on");
  }

  function showP(name) {
    state.tab = name;
    const targetId = panelIdByName(name);
    document.querySelectorAll(".panel").forEach((panel) => panel.classList.remove("on"));
    const target = byId(targetId);
    if (target) target.classList.add("on");
    if (name !== "profile" && name !== "fdetail") setTabVisual(name);
  }

  function sw(name, el) {
    if (el && el.classList) {
      document.querySelectorAll(".rtab").forEach((tab) => tab.classList.remove("on"));
      el.classList.add("on");
    }
    showP(name);
    if (name === "citizens") loadCitizens();
    if (name === "filing") loadFiling(1);
    if (name === "wanted") loadWanted();
    if (name === "gangs") loadGangs();
    if (name === "dash") loadDashboard();
    if (name === "tg") loadTipLine("inbox");
  }

  function renderC(rows) {
    rows = Array.isArray(rows) ? rows : [];
    state.citizensFiltered = rows; window.C = rows;
    const container = byId("clist");
    if (!container) return;
    if (!rows.length) {
      container.innerHTML = '<div class="empty">No se encontraron fichas ciudadanas.</div>';
      return;
    }
    container.innerHTML = rows
      .map((c) => {
        const fullName = safeText((c.firstname || "") + " " + (c.lastname || ""), "Ciudadano Desconocido");
        const desc = safeText(c.description, "Sin notas de campo.");
        const photo = c.image_url
          ? '<img src="' + esc(c.image_url) + '" alt="Foto del ciudadano">'
          : '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:10px;color:#8a6a3a;font-style:italic">SIN FOTO</div>';
        return (
          '<div class="ce" onclick="openP(' +
          Number(c.id || 0) +
          ')">' +
          '<div class="ceph">' +
          photo +
          "</div>" +
          '<div style="flex:1">' +
          '<div class="cen">' +
          esc(fullName) +
          " " +
          statusBadge(c.status) +
          "</div>" +
          '<div class="ced">' +
          esc(desc) +
          "</div>" +
          "</div>" +
          "</div>"
        );
      })
      .join("");
  }

  function filterCitizens(searchValue) {
    const query = String(searchValue || "").trim().toLowerCase();
    const statusFilter = byId("cf") ? String(byId("cf").value || "all").toLowerCase() : "all";
    const filtered = (state.citizens || []).filter((c) => {
      const matchesText =
        query === "" ||
        (c.firstname + " " + c.lastname + " " + (c.aliases || "") + " " + (c.affiliations || ""))
          .toLowerCase()
          .includes(query);
      const matchesEstado =
        statusFilter === "all" || String(c.status || "").toLowerCase() === statusFilter;
      return matchesText && matchesEstado;
    });
    renderC(filtered);
  }

  function fC(query) {
    filterCitizens(query);
  }

  function loadCitizens() {
    const searchInput = document.querySelector("#p-citizens .si");
    const query = searchInput ? searchInput.value : "";
    return nuiFetch("searchIndividuals", { query })
      .then((rows) => {
        state.citizens = Array.isArray(rows) ? rows : [];
        filterCitizens(query);
      })
      .catch(() => notify("No se pudieron cargar ciudadanos."));
  }

  function buildRegistroRows(rows) {
    if (!rows || !rows.length) {
      return '<tr><td colspan="4" style="padding:10px;color:#8a6a3a;font-style:italic">Sin entradas registradas.</td></tr>';
    }
    return rows
      .map((row) => {
        const title =
          (row.penal_code ? row.penal_code + " - " : "") +
          (row.charge || row.charge_name || row.doc_title || "Registro");
        return (
          "<tr>" +
          '<td class="rid">' +
          esc(row.id || "") +
          "</td>" +
          '<td class="rlink">' +
          esc(title) +
          "</td>" +
          "<td>" +
          esc(row.officer_name || row.issued_by || row.created_by_name || "-") +
          "</td>" +
          "<td>" +
          esc(formatDate(row.created_at || row.issued_at || row.updated_at)) +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  function setProfileCitizen(citizen) {
    state.currentCitizen = citizen;
    byId("pn").innerHTML =
      esc((citizen.firstname || "") + " " + (citizen.lastname || "")) + " " + statusBadge(citizen.status);
    byId("pid").textContent = String(citizen.id || "");
    byId("pfn").textContent = safeText((citizen.firstname || "") + " " + (citizen.lastname || ""), "-");
    byId("pfa").textContent = safeText(citizen.aliases, "-");
    byId("pfaf").textContent = safeText(citizen.affiliations, "-");
    byId("pftg").textContent = safeText(citizen.telegram, "-");

    const img = byId("pimgi");
    if (citizen.image_url) {
      img.src = citizen.image_url;
      img.style.display = "block";
    } else {
      img.style.display = "none";
    }

    byId("pfacc").innerHTML =
      "<div><b>Creado:</b> " +
      esc(formatDate(citizen.created_at)) +
      "</div>" +
      "<div><b>Creado por:</b> " +
      esc(safeText(citizen.created_by_name, "-")) +
      "</div>" +
      "<div><b>Actualizado:</b> " +
      esc(formatDate(citizen.updated_at)) +
      "</div>" +
      "<div><b>Actualizado por:</b> " +
      esc(safeText(citizen.updated_by_name, "-")) +
      "</div>";

    byId("pfnotes").textContent = safeText(citizen.notes || citizen.description, "Sin notas registradas.");
    const assoc = safeText(citizen.known_associates, "");
    if (assoc && assoc !== "-") {
      byId("pfassocw").style.display = "block";
      byId("pfassoc").textContent = assoc;
    } else {
      byId("pfassocw").style.display = "none";
      byId("pfassoc").textContent = "";
    }

    byId("pfcr").innerHTML = buildRegistroRows(citizen.charges || []);
    byId("pfmr").innerHTML = buildRegistroRows(citizen.medical_refs || []);

    const activeWarrant = (citizen.warrants || []).find(
      (w) => w.status === "active" || w.status === "pending"
    );
    if (activeWarrant) {
      byId("pw-sec").style.display = "block";
      byId("pwt").textContent = safeText(activeWarrant.title, "-");
      byId("pwd").textContent = formatDate(activeWarrant.created_at);
    } else {
      byId("pw-sec").style.display = "none";
      byId("pwt").textContent = "";
      byId("pwd").textContent = "";
    }
  }

  function openP(id) {
    id = Number(id || 0);
    if (!id) return;
    Promise.all([
      nuiFetch("getIndividual", { id }),
      nuiFetch("getFines", { individualId: id }).catch(() => []),
    ])
      .then(([citizen, fines]) => {
        if (!citizen) return notify("Ficha ciudadana no encontrada.");
        setProfileCitizen(citizen);
        state.currentCitizenFines = Array.isArray(fines) ? fines : [];
        renderProfileFines(state.currentCitizenFines);
        showP("profile");
      })
      .catch(() => notify("No se pudo cargar la ficha ciudadana."));
  }

  function filingFilters() {
    const search = document.querySelector("#p-filing .sbar .si");
    const selects = document.querySelectorAll("#p-filing .sbar .ss");
    const caseType = selects[0] ? selects[0].value : "";
    const stateValue = selects[1] ? selects[1].value : "";
    return {
      search: search ? search.value : "",
      caseType: caseType && caseType !== "Todos los Tipos" ? caseType.toLowerCase().replace(/\s+/g, "_") : "",
      state: stateValue && stateValue !== "Todos los Estados" ? stateValue.toLowerCase().replace(/\s+/g, "_") : "",
    };
  }

  function renderCitationRows(rows) {
    const tbody = byId("ftb");
    if (!tbody) return;
    rows = Array.isArray(rows) ? rows : [];
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty">Sin citaciones registradas.</td></tr>';
      return;
    }
    tbody.innerHTML = rows
      .map((fine) => {
        return (
          `<tr class="fr" onclick="openP(${Number(fine.individual_id || 0)})">` +
          `<td class="fid">${esc(fine.id || "")}</td>` +
          `<td>${esc(safeText(fine.citizen_name, "Ciudadano Desconocido"))} - ${esc(
            safeText(fine.charge, "Fine")
          )}</td>` +
          `<td>$${esc(fine.amount || 0)}</td>` +
          `<td>${fineEstadoBadge(fine.status)}</td>` +
          `<td>${esc(formatDate(fine.created_at))}</td>` +
          `</tr>` +
          `<tr class="fs"><td colspan="5">${esc(
            `${safeText(fine.penal_code, "-")} | Oficial: ${safeText(
              fine.officer_name,
              "-"
            )}`
          )}</td></tr>`
        );
      })
      .join("");
  }

  function renderF(rows) {
    const tbody = byId("ftb");
    if (!tbody) return;
    rows = Array.isArray(rows) ? rows : [];
    window.F = rows;
    if (state.filingMode === "citations") {
      renderCitationRows(rows);
      return;
    }
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty">Sin reportes registrados.</td></tr>';
      return;
    }
    tbody.innerHTML = rows
      .map((row) => {
        const stateValue = row.state || "open";
        const stateClass =
          stateValue === "complete" ? "dn" : stateValue === "ongoing" ? "og" : "op";
        return (
          '<tr class="fr" onclick="openFD(' +
          Number(row.id || 0) +
          ')">' +
          '<td class="fid">' +
          esc(row.id || "") +
          "</td>" +
          "<td>" +
          esc(safeText(row.title, "Reporte sin titulo")) +
          "</td>" +
          "<td>" +
          esc((row.case_type || "case_file").replace(/_/g, " ")) +
          "</td>" +
          '<td><span class="sbdg ' +
          stateClass +
          '">' +
          esc(stateValue.replace(/_/g, " ")) +
          "</span></td>" +
          "<td>" +
          esc(formatDate(row.updated_at || row.created_at)) +
          "</td>" +
          "</tr>" +
          '<tr class="fs"><td colspan="5">' +
          esc(safeText(row.summary, "Sin resumen registrado.")) +
          "</td></tr>"
        );
      })
      .join("");
  }

  function fF(query) {
    const searchInput = document.querySelector("#p-filing .sbar .si");
    if (searchInput && searchInput.value !== query) searchInput.value = query || "";
    loadFiling(1);
  }

  function loadFiling(page) {
    page = Number(page || 1);
    state.filingPage = page;
    if (state.filingMode === "citations") {
      const filters = filingFilters();
      return nuiFetch("getAllFines", {
        filters: { search: filters.search || "", status: filters.state || "" },
        page,
      })
        .then((result) => {
          state.filings = Array.isArray(result?.fines) ? result.fines : [];
          state.filingTotal = Number(result?.totalCount || state.filings.length || 0);
          renderF(state.filings);
          updateFilingPaginar();
        })
        .catch(() => notify("No se pudieron cargar citaciones."));
    }
    return nuiFetch("getCases", { filters: filingFilters(), page })
      .then((result) => {
        state.filings = Array.isArray(result?.cases) ? result.cases : [];
        state.filingTotal = Number(result?.totalCount || state.filings.length || 0);
        renderF(state.filings);
        updateFilingPaginar();
      })
      .catch(() => notify("No se pudo cargar el archivo."));
  }

  function updateFilingPaginar() {
    const pager = byId("filing-pagination");
    if (!pager) return;
    const perPagina = state.filingMode === "citations" ? 15 : 10;
    const maxPaginas = Math.max(1, Math.ceil(Number(state.filingTotal || 0) / perPagina));
    const current = Math.min(maxPaginas, Math.max(1, Number(state.filingPage || 1)));
    pager.innerHTML =
      `<button class="ss" ${current <= 1 ? "disabled" : ""} onclick="loadFiling(${current - 1})">Anterior</button>` +
      `<span style="padding:0 8px">Pagina ${current} / ${maxPaginas}</span>` +
      `<button class="ss" ${current >= maxPaginas ? "disabled" : ""} onclick="loadFiling(${current + 1})">Siguiente</button>`;
  }

  function openFD(caseId) {
    caseId = Number(caseId || 0);
    if (!caseId) return;
    nuiFetch("getCase", { caseId })
      .then((row) => {
        if (!row) return notify("Expediente no encontrado.");
        state.currentCase = row;
        const incidents = Array.isArray(row.incidents) ? row.incidents : [];
        const charges = Array.isArray(row.charges) ? row.charges : [];
        byId("fdcontent").innerHTML =
          '<div class="fdhdr"><div class="fdtype">' +
          esc((row.case_type || "case_file").replace(/_/g, " ")) +
          " | " +
          esc((row.state || "open").replace(/_/g, " ")) +
          '</div><div class="fdtit">' +
          esc(safeText(row.title, "Untitled Case")) +
          '</div></div><div class="ntext"><b>Citizen:</b> ' +
          esc(safeText(row.citizen_name, "N/A")) +
          '</div><div class="ntext" style="margin-top:4px"><b>Summary:</b> ' +
          esc(safeText(row.summary, "No summary.")) +
          '</div><div class="fdc">' +
          esc(safeText(row.content, "Sin texto completo registrado.")).replace(/\n/g, "<br>") +
          '</div><div class="stit" style="margin-top:10px">Incidentees</div>' +
          (incidents.length
            ? incidents
                .map(
                  (inc) =>
                    '<div class="inc"><div class="inc-t"><span>' +
                    esc(safeText(inc.title, "Incidente")) +
                    "</span><span>" +
                    esc(formatDate(inc.date || inc.created_at)) +
                    '</span></div><div class="inc-l">' +
                    esc(safeText(inc.location, "Ubicacion desconocida")) +
                    '</div><div class="inc-d">' +
                    esc(safeText(inc.details, "Sin detalles registrados.")) +
                    "</div></div>"
                )
                .join("")
            : '<div class="empty">No incidents attached.</div>') +
          '<div class="stit" style="margin-top:10px">Cargos</div>' +
          (charges.length
            ? '<table class="rtable"><thead><tr><th></th><th>Charge</th><th>Code</th><th>Fine</th></tr></thead><tbody>' +
              charges
                .map(
                  (ch) =>
                    "<tr><td class=\"rid\">" +
                    esc(ch.id || "") +
                    "</td><td>" +
                    esc(ch.charge_name || ch.charge || "-") +
                    "</td><td>" +
                    esc(ch.penal_code || "-") +
                    "</td><td>$" +
                    esc(ch.fine || 0) +
                    "</td></tr>"
                )
                .join("") +
              "</tbody></table>"
            : '<div class="empty">Sin cargos adjuntos.</div>');
        showP("fdetail");
      })
      .catch(() => notify("No se pudo cargar el detalle del expediente."));
  }

  function renderW(rows) {
    rows = Array.isArray(rows) ? rows : [];
    const grid = byId("wgrid");
    if (!grid) return;
    if (!rows.length) {
      grid.innerHTML =
        '<div class="empty" style="grid-column:1/-1">No hay ordenes activas.</div>';
      return;
    }
    const dColor = (lvl) =>
      ({ low: "#b08a4a", medium: "#cc8800", high: "#c44900", extreme: "#8b0000" }[lvl] ||
        "#8a6a3a");
    grid.innerHTML = rows
      .map(
        (w) =>
          '<div class="wcard" onclick="openP(' +
          Number(w.individual_id || 0) +
          ')"><div class="wcph">CARTEL BUSCADO</div><div class="wcn">' +
          esc(safeText((w.firstname || "") + " " + (w.lastname || ""), "Unknown")) +
          '</div><div class="wcc"><span class="ddot" style="background:' +
          dColor(w.danger_level) +
          '"></span>' +
          esc(safeText(w.charges, w.title || "No listed charge")) +
          '</div><div class="wcb">$' +
          esc(w.bounty || 0) +
          "</div><div class=\"wcd\">" +
          esc(w.status === "pending" ? "Firma Pendiente" : "Activa") +
          "</div></div>"
      )
      .join("");
  }

  function loadWanted() {
    return nuiFetch("getWantedList", {})
      .then((rows) => {
        state.wanted = Array.isArray(rows) ? rows : [];
        renderW(state.wanted);
      })
      .catch(() => notify("No se pudieron cargar buscados."));
  }

  function gangColor(level) {
    return { extreme: "#8b0000", high: "#c44900", medium: "#cc8800" }[level] || "#8a6a3a";
  }

  function renderG(rows) {
    rows = Array.isArray(rows) ? rows : [];
    const list = byId("glist");
    if (!list) return;
    if (!rows.length) {
      list.innerHTML = '<div class="empty">Sin organizaciones registradas.</div>';
      return;
    }
    list.innerHTML = rows
      .map(
        (g) =>
          '<div class="ge" onclick="openGang(' +
          Number(g.id || 0) +
          ')"><div class="gbar" style="background:' +
          gangColor(g.threat_level) +
          '"></div><div style="flex:1"><div class="gn">' +
          esc(g.name || "Unknown") +
          "</div><div class=\"gs\">" +
          esc(safeText(g.alias, "No alias")) +
          " | " +
          esc(safeText(g.territory, "Territorio desconocido")) +
          " | " +
          esc(safeText(g.status, "unknown")) +
          '</div><div class="gm">Amenaza: ' +
          esc(safeText(g.threat_level, "low")) +
          " | " +
          esc(safeText(g.description, "Sin notas.")) +
          '</div></div><div class="gmc">' +
          esc(Number(g.member_count || 0)) +
          '<div class="gmcl">MIEMBROS</div></div></div>'
      )
      .join("");
  }

  function loadGangs() {
    return nuiFetch("getGangs", {})
      .then((rows) => {
        state.gangs = Array.isArray(rows) ? rows : [];
        renderG(state.gangs);
      })
      .catch(() => notify("No se pudo cargar el registro de bandas."));
  }

  function openGang(gangId) {
    gangId = Number(gangId || 0);
    if (!gangId) return;
    nuiFetch("getGang", { gangId }).then((gang) => {
      if (!gang) return;
      const members = (gang.members || [])
        .map((m) => `${m.firstname || ""} ${m.lastname || ""} (${m.role || "Member"})`)
        .join(", ");
      notify(
        `${gang.name || "Gang"}: ${(gang.members || []).length || 0} members. ${
          members || "Sin miembros identificados."
        }`
      );
    });
  }

  function renderD(stats = {}, activity = [], fineStats = {}) {
    const cards = [
      { value: Number(stats.totalIndividuals || 0), label: "Ciudadanos" },
      { value: Number(stats.wantedCount || 0), label: "Buscados" },
      { value: Number(stats.activeWarrants || 0), label: "Ordenes Activas" },
      { value: Number(stats.openCargos || 0), label: "Cargos Abiertos" },
      { value: Number(stats.gangCount || 0), label: "Bandas Conocidas" },
      { value: Number(stats.weekActivity || 0), label: "Actividad (7d)" },
      { value: `$${Number(fineStats.totalCollected || 0)}`, label: "Multas Cobradas" },
      { value: `$${Number(fineStats.totalPending || 0)}`, label: "Multas Pendientes" },
    ];
    const cardsWrap = document.querySelector("#p-dash .dstats");
    if (cardsWrap) {
      cardsWrap.innerHTML = cards
        .map(
          (card) =>
            `<div class="dstat"><span class="dsv">${esc(card.value)}</span><div class="dsl">${esc(
              card.label
            )}</div></div>`
        )
        .join("");
    }
    const feed = byId("afeed");
    if (!feed) return;
    if (!activity.length) {
      feed.innerHTML = '<div class="empty">Sin actividad reciente.</div>';
      return;
    }
    feed.innerHTML = activity
      .slice(0, 20)
      .map(
        (row) =>
          `<div class="ai"><div class="at">${esc(formatDate(row.created_at))}</div><div class="ao">${esc(
            safeText(row.officer_name, "Unknown")
          )}</div><div class="ad">${esc(safeText(row.action, "actualizo registro"))} ${esc(
            safeText(row.target_type, "")
          )} ${esc(safeText(row.details, "")).trim()}</div></div>`
      )
      .join("");
  }

  function loadDashboard() {
    return Promise.all([
      nuiFetch("getDashboardStats", {}),
      nuiFetch("getRecentActivity", {}),
      nuiFetch("getFineStats", {}).catch(() => ({})),
    ])
      .then(([stats, activity, fineStats]) => renderD(stats, activity, fineStats))
      .catch(() => notify("No se pudo cargar el panel."));
  }

  function renderTG(rows) {
    rows = Array.isArray(rows) ? rows : [];
    state.telegramRows = rows;
    const list = byId("tglist");
    if (!list) return;
    if (!rows.length) {
      list.innerHTML = '<div class="empty">Sin telegramas registrados.</div>';
      return;
    }
    list.innerHTML = rows
      .map((row) => {
        const unread = !row.read_at;
        const classes = `tgi${row.urgent ? " urg" : ""}${unread ? " unr" : ""}`;
        return `<div class="${classes}"><div class="tgfl">${row.urgent ? "!" : ""}</div><div class="tgsub">${esc(
          safeText(row.subject, "Sin asunto")
        )}<div style="font-size:10px;color:#6a5030;margin-top:2px">${esc(
          safeText(row.body, "Sin texto")
        )}</div></div><div class="tgfr">${esc(
          safeText(state.telegramMode === "outbox" ? row.to_name : row.from_name, "-")
        )}</div><div class="tgdt">${esc(formatDate(row.created_at))}</div></div>`;
      })
      .join("");
  }

  function loadTipLine(mode) {
    mode = mode || state.telegramMode || "inbox";
    state.telegramMode = mode;
    const endpoint = mode === "outbox" ? "getOutbox" : "getInbox";
    return nuiFetch(endpoint, {})
      .then((rows) => renderTG(rows))
      .catch(() => notify("No se pudo cargar la linea de avisos."));
  }

  function closeMDT() {
    if (!state.open && !state.demo) return;
    actionRequest("close", {}).finally(() => {
      state.open = false;
      if (!state.demo) document.body.style.display = "none";
    });
  }

  function promptCreateCitizen() {
    modalForm({ title: "Agregar Ciudadano", okText: "Crear ficha", fields: [ { name: "firstname", label: "Nombre" }, { name: "lastname", label: "Apellido" }, { name: "aliases", label: "Alias" }, { name: "affiliations", label: "Afiliaciones" }, { name: "telegram", label: "Telegrama" }, { name: "description", label: "Notas / descripcion", type: "textarea" } ] }).then((data) => {
      if (!data) return; if (!data.firstname || !data.lastname) return notify("Nombre y apellido son obligatorios.");
      nuiFetch("createIndividual", { ...data, notes: data.description, status: "clear" }).then(() => { notify("Ficha ciudadana creada."); loadCitizens(); });
    });
  }
  function promptUpdateCitizen() {
    if (!state.currentCitizen) return; const c = state.currentCitizen;
    modalForm({ title: "Editar Ciudadano", okText: "e", fields: [ { name: "firstname", label: "Nombre", value: c.firstname || "" }, { name: "lastname", label: "Apellido", value: c.lastname || "" }, { name: "aliases", label: "Alias", value: c.aliases || "" }, { name: "affiliations", label: "Afiliaciones", value: c.affiliations || "" }, { name: "telegram", label: "Telegrama", value: c.telegram || "" }, { name: "image_url", label: "URL de foto", value: c.image_url || "" }, { name: "status", label: "Estado", type: "select", value: c.status || "clear", options: [ { value: "clear", label: "Limpio" }, { value: "wanted", label: "Buscado" }, { value: "dangerous", label: "Peligroso" }, { value: "deceased", label: "Fallecido" }, { value: "missing", label: "Desaparecido" } ] }, { name: "description", label: "Descripcion", type: "textarea", value: c.description || "" }, { name: "notes", label: "Notas", type: "textarea", value: c.notes || c.description || "" }, { name: "known_associates", label: "Conocidos / asociados", type: "textarea", value: c.known_associates || "" } ] }).then((data) => {
      if (!data) return; if (!data.firstname || !data.lastname) return notify("Nombre y apellido son obligatorios.");
      nuiFetch("updateIndividual", { id: c.id, data: { ...data, dob: c.dob || "" } }).then(() => { notify("Ficha ciudadana actualizada."); openP(c.id); });
    });
  }
  function archiveCurrentCitizen() { if (!state.currentCitizen) return; modalConfirm("Archivar ficha", "Esta accion archivara la ficha ciudadana y cancelara ordenes activas asociadas.", true).then((ok) => { if (!ok) return; nuiFetch("archiveIndividual", { id: state.currentCitizen.id }).then(() => { notify("Ficha ciudadana archivada."); showP("citizens"); loadCitizens(); }); }); }
  function promptCreateWarrant() {
    const current = state.currentCitizen; const fields = []; if (!current) fields.push({ name: "individualId", label: "ID ciudadano MDT", type: "number", value: "0" });
    fields.push({ name: "title", label: "Titulo de orden", value: "Orden de Arresto" }, { name: "charges", label: "Resumen de cargos", type: "textarea" }, { name: "reason", label: "Motivo", type: "textarea" }, { name: "dangerLevel", label: "Nivel de peligro", type: "select", value: "medium", options: [ { value: "low", label: "Bajo" }, { value: "medium", label: "Medio" }, { value: "high", label: "Alto" }, { value: "extreme", label: "Extremo" } ] }, { name: "bounty", label: "Recompensa", type: "number", value: "0" });
    modalForm({ title: "Crear Orden", okText: "Crear borrador", fields }).then((data) => { if (!data) return; const individualId = current ? Number(current.id) : Number(data.individualId || 0); if (!individualId || !data.title) return notify("Ciudadano y titulo son obligatorios."); nuiFetch("createWarrant", { individualId, title: data.title, charges: data.charges, reason: data.reason, dangerLevel: data.dangerLevel, bounty: Number(data.bounty || 0) }).then(() => { notify("Orden enviada para firma."); loadWanted(); if (state.currentCitizen?.id === individualId) openP(individualId); }); });
  }
  function promptCreateGang() { modalForm({ title: "Nueva Banda", okText: "Crear ficha", fields: [ { name: "name", label: "Nombre" }, { name: "alias", label: "Alias" }, { name: "territory", label: "Territorio" }, { name: "threatLevel", label: "Amenaza", type: "select", value: "low", options: [ { value: "low", label: "Baja" }, { value: "medium", label: "Media" }, { value: "high", label: "Alta" }, { value: "extreme", label: "Extrema" } ] }, { name: "description", label: "Descripcion", type: "textarea" } ] }).then((data) => { if (!data) return; if (!data.name) return notify("El nombre de la banda es obligatorio."); nuiFetch("createGang", { ...data, status: "active" }).then(() => { notify("Ficha de banda creada."); loadGangs(); }); }); }
  function quickCreateCase(caseType) { const citizen = state.currentCitizen; if (!citizen) return; modalForm({ title: caseType === "medical_report" ? "Reporte Medico" : "Reporte de Arresto", okText: "Registrar", fields: [ { name: "title", label: "Titulo", value: caseType === "medical_report" ? "Reporte Medico" : "Reporte de Arresto" }, { name: "summary", label: "Resumen", type: "textarea" }, { name: "content", label: "Reporte completo", type: "textarea" } ] }).then((data) => { if (!data || !data.title) return; nuiFetch("createCase", { title: data.title, caseType, state: "open", summary: data.summary || "", content: data.content || data.summary || "", accessLevel: "law", citizenId: citizen.id, citizenName: `${citizen.firstname || ""} ${citizen.lastname || ""}`, incidents: [], charges: [] }).then(() => { notify("Reporte registrado."); loadFiling(1); }); }); }
  function promptCreateCase() { quickMenu("Nuevo documento", [ { value: "case_file", label: "Expediente" }, { value: "arrest_report", label: "Reporte de Arresto" }, { value: "citation", label: "Citacion" }, { value: "arrest_warrant", label: "Orden de Arresto" }, { value: "medical_report", label: "Reporte Medico" }, { value: "incident", label: "Generico" } ]).then((type) => { if (!type) return; modalForm({ title: "Nuevo Archivo", okText: "Registrar", fields: [ { name: "title", label: "Titulo" }, { name: "state", label: "Estado", type: "select", value: "open", options: [{ value: "open", label: "Abierto" }, { value: "ongoing", label: "En curso" }, { value: "complete", label: "Completo" }] }, { name: "summary", label: "Resumen", type: "textarea" }, { name: "content", label: "Contenido", type: "textarea" } ] }).then((data) => { if (!data || !data.title) return; nuiFetch("createCase", { title: data.title, caseType: type, state: data.state, summary: data.summary || "", content: data.content || data.summary || "", accessLevel: "law", citizenId: null, citizenName: "", incidents: [], charges: [] }).then(() => { notify("Archivo registrado."); loadFiling(1); }); }); }); }
  function promptUpdateCase() { const c = state.currentCase; if (!c) return; modalForm({ title: "Editar Archivo", okText: "Guardar", fields: [ { name: "title", label: "Titulo", value: c.title || "" }, { name: "state", label: "Estado", type: "select", value: c.state || "open", options: [{ value: "open", label: "Abierto" }, { value: "ongoing", label: "En curso" }, { value: "complete", label: "Completo" }, { value: "archived", label: "Archivado" }] }, { name: "summary", label: "Resumen", type: "textarea", value: c.summary || "" }, { name: "content", label: "Contenido", type: "textarea", value: c.content || "" } ] }).then((data) => { if (!data || !data.title) return; nuiFetch("updateCase", { caseId: c.id, data: { title: data.title, caseType: c.case_type || "case_file", state: data.state, summary: data.summary || "", content: data.content || "", accessLevel: c.access_level || "law", citizenId: c.citizen_id || null, citizenName: c.citizen_name || "", incidents: c.incidents || [], charges: c.charges || [] } }).then(() => { notify("Archivo actualizado."); openFD(c.id); }); }); }
  function promptSendTelegram() { modalForm({ title: "Nuevo Aviso", okText: "Enviar", fields: [ { name: "toIdentifier", label: "Identificador destinatario" }, { name: "toName", label: "Nombre destinatario" }, { name: "subject", label: "Asunto" }, { name: "urgent", label: "Urgente", type: "select", value: "0", options: [{ value: "0", label: "No" }, { value: "1", label: "Si" }] }, { name: "body", label: "Mensaje", type: "textarea" } ] }).then((data) => { if (!data) return; if (!data.toIdentifier || !data.subject || !data.body) return notify("Destinatario, asunto y mensaje son obligatorios."); nuiFetch("sendTelegram", { toIdentifier: data.toIdentifier, toName: data.toName, subject: data.subject, body: data.body, urgent: data.urgent === "1", refCaseId: null }).then(() => { notify("Aviso enviado."); loadTipLine("outbox"); }); }); }
  function getFinePresets() {
    if (Array.isArray(state.finePresets) && state.finePresets.length > 0) {
      return Promise.resolve(state.finePresets);
    }
    return nuiFetch("getFinePresets", {})
      .then((rows) => {
        state.finePresets = Array.isArray(rows) ? rows : [];
        return state.finePresets;
      })
      .catch(() => []);
  }

  function buildFinePresetOptions(presets) {
    const grouped = {};
    (presets || []).forEach((preset, index) => {
      const category = String(preset.category || "OTROS").trim().toUpperCase();
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push({
        value: String(index),
        label: `[${preset.penal_code}] ${preset.charge} - $${Number(preset.amount || 0)}`,
      });
    });

    const categories = Object.keys(grouped).sort((a, b) => a.localeCompare(b));
    const options = [{ value: "custom", label: "Multa personalizada" }];
    categories.forEach((category) => {
      options.push({
        label: `Codigo Penal - ${category}`,
        options: grouped[category],
      });
    });
    return options;
  }

  function promptIssueFine() {
    if (!state.currentCitizen) return notify("Abre primero una ficha ciudadana.");
    getFinePresets().then((presets) => {
      const options = buildFinePresetOptions(presets || []);
      modalForm({ title: "Emitir Multa", okText: "Emitir", note: `${state.currentCitizen.firstname || ""} ${state.currentCitizen.lastname || ""}`, fields: [ { name: "preset", label: "Preset", type: "select", options }, { name: "charge", label: "Cargo" }, { name: "penalCode", label: "Codigo penal" }, { name: "category", label: "Categoria", value: "ORDER" }, { name: "amount", label: "Monto ($)", type: "number" }, { name: "location", label: "Ubicacion" }, { name: "description", label: "Descripcion", type: "textarea" } ] }).then((data) => {
        if (!data) return; const selected = data.preset !== "custom" ? presets[Number(data.preset)] : null; const charge = (data.charge || selected?.charge || "").trim(); const amount = Number(data.amount || selected?.amount || 0); if (!charge) return notify("El cargo es obligatorio."); if (!amount || amount <= 0) return notify("El monto debe ser mayor a cero.");
        nuiFetch("issueFine", { individualId: Number(state.currentCitizen.id), charge, penalCode: (data.penalCode || selected?.penal_code || "").trim(), category: (data.category || selected?.category || "ORDER").trim(), amount, location: (data.location || "").trim(), description: (data.description || selected?.description || "").trim() }).then(() => { notify("Multa emitida."); openP(state.currentCitizen.id); });
      });
    });
  }
  function cancelFineFromProfile(fineId) { fineId = Number(fineId || 0); if (!fineId) return; modalReason("Cancelar multa", "Razon de cancelacion").then((reason) => { if (!reason || reason.length < 4) return notify("La razon debe tener al menos 4 caracteres."); nuiFetch("cancelFine", { fineId, reason }).then(() => { notify("Multa cancelada."); if (state.currentCitizen?.id) openP(state.currentCitizen.id); }); }); }
  function waiveFineFromProfile(fineId) { fineId = Number(fineId || 0); if (!fineId) return; modalReason("Perdonar multa", "Razon para perdonar").then((reason) => { if (!reason || reason.length < 4) return notify("La razon debe tener al menos 4 caracteres."); nuiFetch("waiveFine", { fineId, reason }).then(() => { notify("Multa perdonada."); if (state.currentCitizen?.id) openP(state.currentCitizen.id); }); }); }
  function setFilingMode(mode) {
    state.filingMode = mode === "citations" ? "citations" : "cases";
    const btnCases = byId("fm-cases");
    const btnCitaciones = byId("fm-citations");
    if (btnCases) btnCases.style.fontWeight = state.filingMode === "cases" ? "700" : "400";
    if (btnCitaciones) btnCitaciones.style.fontWeight = state.filingMode === "citations" ? "700" : "400";

    const selects = document.querySelectorAll("#p-filing .sbar .ss");
    if (selects[0] && selects[1]) {
      if (state.filingMode === "citations") {
        selects[0].style.display = "none";
        selects[1].innerHTML =
          '<option value="">Todos los Estados</option><option value="pending">Pendiente</option><option value="overdue">Vencida</option><option value="paid">Pagada</option><option value="cancelled">Cancelada</option><option value="waived">Perdonada</option>';
      } else {
        selects[0].style.display = "";
        selects[0].innerHTML =
          "<option>Todos los Tipos</option><option>Expediente</option><option>Reporte de Arresto</option><option>Orden de Arresto</option><option>Reporte Medico</option>";
        selects[1].innerHTML =
          "<option>Todos los Estados</option><option>Abierto</option><option>En curso</option><option>Completo</option>";
      }
    }
    loadFiling(1);
  }

  function showFineNotification(data = {}) {
    const existing = byId("fine-notice-overlay");
    if (existing) existing.remove();
    const overlay = document.createElement("div");
    overlay.id = "fine-notice-overlay";
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;z-index:10000;";
    overlay.innerHTML =
      '<div style="width:min(480px,88vw);background:#f2e8d0;border:2px solid #8a6a3a;padding:16px;box-shadow:0 8px 24px rgba(0,0,0,.35);font-family:\'Crimson Text\',serif;cursor:pointer"><div style="font-family:\'Playfair Display\',serif;font-size:28px;color:#8b0000;text-align:center;letter-spacing:.04em">CITACION EMITIDA</div><div style="margin-top:8px;text-align:center;color:#2c1a0e">' +
      esc(safeText(data.charge, "Cargo no especificado")) +
      '</div><div style="margin-top:4px;font-family:\'Playfair Display\',serif;font-size:34px;text-align:center;color:#2c1a0e">$' +
      esc(data.amount || 0) +
      '</div><div style="margin-top:8px;text-align:center;color:#5a3e1b">Usa /fines para ver tus multas. Usa /payfine [ID] cash para pagar.</div></div>';
    overlay.addEventListener("click", () => overlay.remove());
    document.body.appendChild(overlay);
    if (!state.open) document.body.style.display = "flex";
    setTimeout(() => {
      if (overlay.parentNode) overlay.remove();
      if (!state.open && !state.demo) document.body.style.display = "none";
    }, 10000);
  }

  function cleanupTextNodes() {
    const tabs = document.querySelectorAll(".rtab");
    ES.tabs.forEach((label, i) => { if (tabs[i]) tabs[i].textContent = label; });

    const tgTitle = document.querySelector("#p-tg .ptitle");
    if (tgTitle) tgTitle.textContent = "Linea de Avisos - Despacho Interno";

    const wantedTitle = document.querySelector("#p-wanted .ptitle");
    if (wantedTitle) wantedTitle.textContent = "Buscados - Ordenes Activas";

    document.querySelectorAll(".pa").forEach((btn) => {
      let text = String(btn.textContent || "");
      text = text.replace(/[^\x20-\x7E]+/g, " ").replace(/\s+/g, " ").trim();
      const lower = text.toLowerCase();

      if (lower.includes("add citizen")) btn.textContent = "Agregar Ciudadano";
      else if (lower.includes("new warrant")) btn.textContent = "Nueva Orden";
      else if (lower.includes("refresh")) btn.textContent = "Actualizar";
      else if (lower.includes("back")) btn.textContent = "Volver";
      else if (lower.includes("archive")) btn.textContent = "Archivar";
      else if (lower.includes("save")) {
        btn.textContent = btn.closest("#p-profile") ? "Editar" : "Guardar";
      }
      else if (lower.includes("outbox")) btn.textContent = "Salida";
      else if (lower.includes("inbox")) btn.textContent = "Entrada";
      else if (lower.includes("new")) btn.textContent = "Nuevo";
      else btn.textContent = text || "Accion";
    });
  }
  function setupActionButtons() {
    const citizenAcciones = document.querySelectorAll("#p-citizens .ptitle-actions .pa");
    if (citizenAcciones[0]) citizenAcciones[0].onclick = promptCreateCitizen;
    if (citizenAcciones[1]) citizenAcciones[1].onclick = loadCitizens;
    if (citizenAcciones[2]) citizenAcciones[2].onclick = closeMDT;

    const profileAcciones = document.querySelectorAll("#p-profile .ptitle-actions .pa");
    if (profileAcciones[0]) profileAcciones[0].onclick = archiveCurrentCitizen;
    if (profileAcciones[1]) profileAcciones[1].onclick = promptUpdateCitizen;
    if (profileAcciones[2]) profileAcciones[2].onclick = () => state.currentCitizen && openP(state.currentCitizen.id);
    if (profileAcciones[3]) profileAcciones[3].onclick = () => {
      showP("citizens");
      loadCitizens();
    };

    const profileButtons = document.querySelectorAll("#p-profile .abtn");
    if (profileButtons[0]) profileButtons[0].onclick = () => quickCreateCase("arrest_report");
    if (profileButtons[1]) profileButtons[1].onclick = promptCreateWarrant;
    if (profileButtons[2]) profileButtons[2].onclick = () => quickCreateCase("medical_report");
    const issueFineBtn = byId("p-issue-fine");
    if (issueFineBtn) issueFineBtn.onclick = promptIssueFine;

    const filingAcciones = document.querySelectorAll("#p-filing .ptitle-actions .pa");
    if (filingAcciones[0]) filingAcciones[0].onclick = promptCreateCase;
    if (filingAcciones[1]) filingAcciones[1].onclick = () => loadFiling(state.filingPage);
    if (filingAcciones[2]) filingAcciones[2].onclick = () => showP("filing");
    const fmCases = byId("fm-cases");
    const fmCitaciones = byId("fm-citations");
    if (fmCases) fmCases.onclick = () => setFilingMode("cases");
    if (fmCitaciones) fmCitaciones.onclick = () => setFilingMode("citations");

    const fDetailAcciones = document.querySelectorAll("#p-fdetail .ptitle-actions .pa");
    if (fDetailAcciones[0]) fDetailAcciones[0].onclick = promptUpdateCase;
    if (fDetailAcciones[1]) fDetailAcciones[1].onclick = () => state.currentCase && openFD(state.currentCase.id);
    if (fDetailAcciones[2]) fDetailAcciones[2].onclick = () => showP("filing");

    const wantedAcciones = document.querySelectorAll("#p-wanted .ptitle-actions .pa");
    if (wantedAcciones[0]) wantedAcciones[0].onclick = promptCreateWarrant;
    if (wantedAcciones[1]) wantedAcciones[1].onclick = loadWanted;

    const gangAcciones = document.querySelectorAll("#p-gangs .ptitle-actions .pa");
    if (gangAcciones[0]) gangAcciones[0].onclick = promptCreateGang;
    if (gangAcciones[1]) gangAcciones[1].onclick = loadGangs;

    const dashAcciones = document.querySelectorAll("#p-dash .ptitle-actions .pa");
    if (dashAcciones[0]) dashAcciones[0].onclick = loadDashboard;

    const tgAcciones = document.querySelectorAll("#p-tg .ptitle-actions .pa");
    if (tgAcciones[0]) tgAcciones[0].onclick = promptSendTelegram;
    if (tgAcciones[1]) tgAcciones[1].onclick = () => loadTipLine("inbox");
    if (tgAcciones[2]) tgAcciones[2].onclick = () => loadTipLine("outbox");
  }

  function updateHeader(data = {}) {
    const dept = document.querySelector(".dept");
    const off = document.querySelector(".off");
    const sealInner = document.querySelector(".seal-inner");
    if (dept) dept.textContent = data.serverName || state.serverName;
    if (off) off.textContent = (data.player && data.player.name) || state.player.name;
    if (sealInner) sealInner.textContent = data.departmentSeal || state.departmentSeal;
  }

  function applyOpenData(data = {}) {
    state.open = true;
    state.demo = false;
    if (data.player) state.player = data.player;
    if (data.serverName) state.serverName = data.serverName;
    if (data.departmentSeal) state.departmentSeal = data.departmentSeal;
    if (data.penalCode) state.penalCode = data.penalCode;
    if (data.caseTypes) state.caseTypes = data.caseTypes;
    if (data.caseStates) state.caseStates = data.caseStates;
    updateHeader(data);
    document.body.style.display = "flex";
    showP("citizens");
    setTabVisual("citizens");
    loadCitizens();
  }

  function bindGlobalEvents() {
    window.addEventListener("message", (event) => {
      const payload = event.data || {};
      if (payload.type === "open") applyOpenData(payload.data || {});
      else if (payload.type === "hide") {
        state.open = false;
        if (!state.demo) document.body.style.display = "none";
      } else if (payload.type === "fineNotification") showFineNotification(payload.data || {});
      else if (payload.type === "fineIssued") notify("Multa emitida correctamente.");
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMDT();
    });
  }

  function initialize() {
    cleanupTextNodes();
    ensureFinesLayout();
    setupActionButtons();
    bindGlobalEvents();
    if (state.demo) {
      document.body.style.display = "flex";
      updateHeader({
        serverName: state.serverName,
        departmentSeal: state.departmentSeal,
        player: state.player,
      });
      showP("citizens");
      setTabVisual("citizens");
      loadCitizens();
    }
  }

  window.sw = sw;
  window.showP = showP;
  window.renderC = renderC;
  window.fC = fC;
  window.openP = openP;
  window.renderF = renderF;
  window.fF = fF;
  window.openFD = openFD;
  window.renderW = renderW;
  window.renderG = renderG;
  window.renderD = renderD;
  window.renderTG = renderTG;
  window.loadCitizens = loadCitizens;
  window.loadFiling = loadFiling;
  window.loadWanted = loadWanted;
  window.loadGangs = loadGangs;
  window.loadDashboard = loadDashboard;
  window.loadTipLine = loadTipLine;
  window.closeMDT = closeMDT;
  window.openGang = openGang;
  window.cancelFineFromProfile = cancelFineFromProfile;
  window.waiveFineFromProfile = waiveFineFromProfile;
  window.setFilingMode = setFilingMode;
  window.promptIssueFine = promptIssueFine;

  document.addEventListener("DOMContentLoaded", initialize);
})();
