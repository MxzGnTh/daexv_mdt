(function () {
  "use strict";

  const RESOURCE_NAME =
    typeof GetParentResourceName === "function" ? GetParentResourceName() : "daexv_mdt";
  const IS_RUNTIME = typeof GetParentResourceName === "function";

  const CALLBACK_ENDPOINTS = new Set([
    "searchIndividuals",
    "getIndividual",
    "getCharges",
    "getFines",
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
    "getFinePresets",
    "getAllFines",
    "getFineStats"
  ]);

  const LABELS = {
    statuses: {
      clear: "Limpio",
      wanted: "Buscado",
      dangerous: "Peligroso",
      deceased: "Fallecido",
      missing: "Desaparecido",
      archived: "Archivado",
      open: "Abierto",
      ongoing: "En curso",
      complete: "Completo",
      active: "Activo",
      pending: "Pendiente",
      executed: "Ejecutado",
      cancelled: "Cancelado",
      unknown: "Desconocido",
      low: "Bajo",
      medium: "Medio",
      high: "Alto",
      extreme: "Extremo"
    },
    caseTypes: {
      case_file: "Expediente",
      arrest_report: "Reporte de Arresto",
      arrest_warrant: "Orden de Arresto",
      medical_report: "Informe Medico",
      citation: "Citacion",
      incident: "Reporte de Incidente"
    }
  };

  const state = {
    open: false,
    demo: !IS_RUNTIME,
    player: {
      name: "Peter Walsh",
      rank: "marshal",
      level: 3,
      identifier: "demo-001"
    },
    serverName: "Oficina del Sheriff de Monroe",
    departmentSeal: "MSO",
    caseTypes: [],
    caseStates: [],
    penalCode: {},
    penalCodeSource: "config",
    penalCodeFallback: false,
    fineJurisdictions: [],
    currentTab: "citizens",
    citizens: [],
    currentCitizen: null,
    caseRows: [],
    casePage: 1,
    caseTotal: 0,
    currentCase: null,
    wantedRows: [],
    gangRows: [],
    currentGang: null,
    telegramMode: "inbox"
  };

  const demo = {
    citizens: [
      {
        id: 144,
        identifier: "cit-144",
        firstname: "Austin",
        lastname: "Wallace",
        aliases: "Hooter, Austin",
        affiliations: "The Wallace Gang",
        telegram: "HOOTER",
        status: "wanted",
        description: "Austin Wallace, the enigmatic and cunning leader of the notorious Wallace Gang.",
        image_url: "",
        notes: "Austin Wallace operates from Shady Belle and keeps armed company nearby.",
        known_associates: "Bobby Buchanan",
        created_at: "28 Jan 1900 12:13",
        updated_at: "30 Jan 1900 17:03"
      },
      {
        id: 138,
        identifier: "cit-138",
        firstname: "James",
        lastname: '"Jim" Butcher',
        aliases: "Jim",
        affiliations: "The Butcher Gang",
        telegram: "JIMB",
        status: "wanted",
        description: "Jim Butcher remains one of the most dangerous outlaws still at large in Monroe.",
        image_url: "",
        notes: "Current whereabouts unknown. Use caution if sighted.",
        known_associates: ""
      },
      {
        id: 131,
        identifier: "cit-131",
        firstname: "Alexander",
        lastname: "Drake",
        aliases: "The Pirate King",
        affiliations: "Liberatalia Pirates",
        telegram: "DRAKE",
        status: "dangerous",
        description: "Formerly known as the King of the pirates of Liberatalia.",
        image_url: "",
        notes: "Has a history of violence and coordinated raids.",
        known_associates: ""
      },
      {
        id: 125,
        identifier: "cit-125",
        firstname: "Charles",
        lastname: "Scott",
        aliases: "Chuck",
        affiliations: "Scarlett Meadows Outfit",
        telegram: "",
        status: "clear",
        description: "Charles Scott leads a smaller criminal outfit near Scarlett Ranch.",
        image_url: "",
        notes: "Currently under watch.",
        known_associates: ""
      },
      {
        char_id: 209,
        identifier: "209",
        firstname: "Edgar",
        lastname: "Pike",
        job: "rancher",
        status: "",
        description: "Personaje registrado en el servidor. Oficio actual: rancher. ID: 209.",
        image_url: "",
        source: "character",
        hasFile: false
      }
    ],
    cases: [
      {
        id: 86,
        title: "The Butcher Gang",
        case_type: "case_file",
        state: "ongoing",
        summary: "Jim Butcher is still at large after a breach at Fort Wallace.",
        citizen_name: 'James "Jim" Butcher',
        created_at: "28 Jan 1900 17:53",
        updated_at: "30 Jan 1900 17:09",
        content: "Filed reports confirm Jim Butcher's involvement in the Fort Wallace incident."
      },
      {
        id: 87,
        title: "Shannon Lane Coroner's Report",
        case_type: "medical_report",
        state: "complete",
        summary: "Medical and coroner findings transferred to the Saint Denis office.",
        citizen_name: "Shannon Lane",
        created_at: "28 Jan 1900 17:59",
        updated_at: "28 Jan 1900 18:47",
        content: "Medical findings record severe gunshot wounds and septic complications."
      },
      {
        id: 85,
        title: "#33032 Austin Wallace: Shooting",
        case_type: "arrest_report",
        state: "open",
        summary: "Austin Wallace was apprehended following a shooting in Saint Denis.",
        citizen_name: "Austin Wallace",
        created_at: "28 Jan 1900 16:06",
        updated_at: "28 Jan 1900 16:08",
        content: "Austin Wallace was apprehended after an armed confrontation."
      }
    ],
    wanted: [
      {
        id: 21,
        individual_id: 144,
        firstname: "Austin",
        lastname: "Wallace",
        aliases: "Hooter",
        title: "Orden de Arresto: Austin Wallace",
        charges: "Attempted Murder, Assault",
        danger_level: "high",
        bounty: 500,
        status: "active",
        created_at: "28 Jan 1900 12:39"
      },
      {
        id: 22,
        individual_id: 138,
        firstname: "James",
        lastname: '"Jim" Butcher',
        aliases: "Jim",
        title: "Orden de Arresto: Jim Butcher",
        charges: "Murder, Jailbreak, Armed Robbery",
        danger_level: "extreme",
        bounty: 1000,
        status: "pending",
        created_at: "28 Jan 1900 12:39"
      }
    ],
    gangs: [
      {
        id: 1,
        name: "The Wallace Gang",
        alias: "Wallace Boys",
        territory: "Saint Denis - Lemoyne",
        threat_level: "high",
        status: "active",
        description: "Organized criminal outfit led by Austin Wallace.",
        notes: "",
        member_count: 6,
        members: [
          { firstname: "Austin", lastname: "Wallace", role: "Leader", individual_status: "wanted" },
          { firstname: "Bobby", lastname: "Buchanan", role: "Lieutenant", individual_status: "clear" }
        ]
      },
      {
        id: 2,
        name: "The Butcher Gang",
        alias: "Butchers",
        territory: "West Elizabeth",
        threat_level: "extreme",
        status: "active",
        description: "Notorious gang led by Jim Butcher.",
        notes: "",
        member_count: 4,
        members: [
          { firstname: "James", lastname: '"Jim" Butcher', role: "Leader", individual_status: "wanted" }
        ]
      }
    ],
    activity: [
      { officer_name: "Peter Walsh", action: "updated", target_type: "case", details: "The Butcher Gang", created_at: "30 Jan 17:09" },
      { officer_name: "Peter Walsh", action: "updated", target_type: "individual", details: "Austin Wallace", created_at: "30 Jan 17:03" },
      { officer_name: "Micah Moore", action: "signed", target_type: "warrant", details: 'Jim Butcher', created_at: "28 Jan 14:14" }
    ],
    telegraphs: [
      { id: 1, from_name: "Micah Moore", subject: "URGENT: Tucker Gang near Rhodes", body: "Riders spotted east of Rhodes. Move a patrol if able.", urgent: 1, read_at: null, created_at: "11 Apr 22:15" },
      { id: 2, from_name: "Luis Smith", subject: "Campbell arrest report", body: "Report filed and witness statement attached.", urgent: 0, read_at: null, created_at: "28 Jan 13:10" },
      { id: 3, from_name: "Donatus Colonna", subject: "Re: Butcher Gang investigation", body: "Additional testimony forwarded to the filing cabinet.", urgent: 0, read_at: "27 Jan 09:48", created_at: "27 Jan 09:45" }
    ],
    fineJurisdictions: [
      {
        name: "New Hanover",
        counties: [
          { name: "The Heartlands", towns: ["Valentine", "Emerald Ranch", "Flatneck Station", "Cornwall Kerosene & Tar"] },
          { name: "Cumberland Forest", towns: ["Bacchus Station", "Fort Wallace"] },
          { name: "Roanoke Ridge", towns: ["Annesburg", "Van Horn", "Butcher Creek"] }
        ]
      },
      {
        name: "West Elizabeth",
        counties: [
          { name: "Great Plains", towns: ["Blackwater", "Beecher's Hope"] },
          { name: "Tall Trees", towns: ["Manzanita Post", "Aurora Basin"] },
          { name: "Big Valley", towns: ["Strawberry", "Wallace Station"] }
        ]
      },
      {
        name: "Lemoyne",
        counties: [
          { name: "Scarlett Meadows", towns: ["Rhodes", "Braithwaite Manor", "Caliga Hall"] },
          { name: "Bluewater Marsh", towns: ["Lagras", "Lakay"] },
          { name: "Bayou Nwa", towns: ["Saint Denis", "Pleasance"] }
        ]
      },
      {
        name: "Ambarino",
        counties: [
          { name: "Grizzlies East", towns: ["Wapiti", "Cotorra Springs"] },
          { name: "Grizzlies West", towns: ["Colter"] }
        ]
      },
      {
        name: "New Austin",
        counties: [
          { name: "Hennigan's Stead", towns: ["Armadillo", "MacFarlane's Ranch"] },
          { name: "Cholla Springs", towns: ["Tumbleweed", "Ridgewood Farm"] },
          { name: "Rio Bravo", towns: ["Fort Mercer", "Benedict Point"] },
          { name: "Gaptooth Ridge", towns: ["Gaptooth Breach"] }
        ]
      }
    ]
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safeText(value, fallback) {
    const text = String(value == null ? "" : value).trim();
    return text || fallback || "";
  }

  function truncate(value, limit) {
    const text = safeText(value, "");
    if (!limit || text.length <= limit) {
      return text;
    }
    return text.slice(0, limit - 1) + "...";
  }

  function statusLabel(value) {
    const key = String(value || "").toLowerCase();
    return LABELS.statuses[key] || safeText(value, "-");
  }

  function caseTypeLabel(value) {
    const key = String(value || "").toLowerCase();
    return LABELS.caseTypes[key] || safeText(String(value || "").replace(/_/g, " "), "-");
  }

  function getPenalCatalog() {
    const raw = state.penalCode || {};

    if (Array.isArray(raw)) {
      return raw.map(function (category, index) {
        return {
          key: String(category.id || category.key || index),
          label: safeText(category.label || category.category || category.name, "Categoria"),
          charges: Array.isArray(category.charges) ? category.charges : (Array.isArray(category.articles) ? category.articles.map(function (article) {
            return {
              code: article.code,
              name: article.name,
              time: article.time == null ? article.sentence : article.time,
              fine: article.fine,
              description: article.description,
              severity: article.severity
            };
          }) : [])
        };
      });
    }

    return Object.keys(raw).map(function (key) {
      const category = raw[key] || {};
      return {
        key: key,
        label: safeText(category.label || key.replace(/_/g, " "), "Categoria"),
        charges: Array.isArray(category.charges) ? category.charges : []
      };
    });
  }

  function getPenalArticleByCode(code) {
    const normalizedCode = String(code || "").trim().toUpperCase();
    if (!normalizedCode) {
      return null;
    }

    const categories = getPenalCatalog();
    for (let i = 0; i < categories.length; i += 1) {
      const category = categories[i];
      for (let j = 0; j < category.charges.length; j += 1) {
        const article = category.charges[j];
        if (String(article.code || "").trim().toUpperCase() === normalizedCode) {
          return Object.assign({ category: category.label }, article);
        }
      }
    }

    return null;
  }

  function getFineJurisdictionCatalog() {
    return Array.isArray(state.fineJurisdictions) ? state.fineJurisdictions : [];
  }

  function findJurisdictionState(stateName) {
    const key = safeText(stateName, "").toLowerCase();
    return getFineJurisdictionCatalog().find(function (entry) {
      return safeText(entry.name, "").toLowerCase() === key;
    }) || null;
  }

  function findJurisdictionCounty(stateName, countyName) {
    const stateEntry = findJurisdictionState(stateName);
    if (!stateEntry) {
      return null;
    }
    const countyKey = safeText(countyName, "").toLowerCase();
    return (stateEntry.counties || []).find(function (entry) {
      return safeText(entry.name, "").toLowerCase() === countyKey;
    }) || null;
  }

  function formatJurisdiction(stateName, countyName, townName, fallbackLocation) {
    const parts = [];
    if (safeText(townName, "")) {
      parts.push(safeText(townName, ""));
    }
    if (safeText(countyName, "")) {
      parts.push(safeText(countyName, ""));
    }
    if (safeText(stateName, "")) {
      parts.push(safeText(stateName, ""));
    }
    return parts.length ? parts.join(", ") : safeText(fallbackLocation, "");
  }

  function formatFineLocationDisplay(fine) {
    const jurisdiction = formatJurisdiction(fine.state_name, fine.county_name, fine.town_name, fine.location);
    const detail = safeText(fine.location_detail || fine.locationDetail, "");
    if (jurisdiction && detail) {
      return jurisdiction + " - " + detail;
    }
    return jurisdiction || detail || safeText(fine.location, "Sin jurisdiccion");
  }

  function fillSelectOptions(selectNode, values, placeholder, selectedValue) {
    if (!selectNode) {
      return;
    }
    const options = ['<option value="">' + escapeHtml(placeholder) + "</option>"];
    (values || []).forEach(function (value) {
      options.push('<option value="' + escapeHtml(value) + '">' + escapeHtml(value) + "</option>");
    });
    selectNode.innerHTML = options.join("");
    if (selectedValue) {
      selectNode.value = selectedValue;
    }
  }

  function bindFineJurisdictionSelectors(initialValues) {
    const values = initialValues || {};
    const stateSelect = document.getElementById("fineStateSelect");
    const countySelect = document.getElementById("fineCountySelect");
    const townSelect = document.getElementById("fineTownSelect");
    const states = getFineJurisdictionCatalog().map(function (entry) {
      return entry.name;
    });

    function refreshCounties(selectedState, selectedCounty) {
      const stateEntry = findJurisdictionState(selectedState);
      const counties = stateEntry ? (stateEntry.counties || []).map(function (entry) { return entry.name; }) : [];
      fillSelectOptions(countySelect, counties, "Seleccione un condado", selectedCounty);
      if (!counties.length) {
        fillSelectOptions(townSelect, [], "Seleccione un pueblo", "");
      }
    }

    function refreshTowns(selectedState, selectedCounty, selectedTown) {
      const countyEntry = findJurisdictionCounty(selectedState, selectedCounty);
      fillSelectOptions(townSelect, countyEntry ? countyEntry.towns || [] : [], "Seleccione un pueblo", selectedTown);
    }

    fillSelectOptions(stateSelect, states, "Seleccione un estado", values.stateName || values.state_name || "");
    refreshCounties(stateSelect ? stateSelect.value : "", values.countyName || values.county_name || "");
    refreshTowns(stateSelect ? stateSelect.value : "", countySelect ? countySelect.value : "", values.townName || values.town_name || "");

    if (stateSelect) {
      stateSelect.addEventListener("change", function () {
        refreshCounties(stateSelect.value, "");
        refreshTowns(stateSelect.value, "", "");
      });
    }
    if (countySelect) {
      countySelect.addEventListener("change", function () {
        refreshTowns(stateSelect ? stateSelect.value : "", countySelect.value, "");
      });
    }
  }

  function setLoading(targetId, message) {
    byId(targetId).innerHTML = '<div class="empty-state empty-state--loading">' + escapeHtml(message) + "</div>";
  }

  function renderPhoto(url, className) {
    if (safeText(url, "") !== "") {
      return '<img src="' + escapeHtml(url) + '" alt="">';
    }
    return '<div class="portrait-placeholder ' + className + '">SIN FOTO</div>';
  }

  function toast(message) {
    const node = byId("toast");
    node.textContent = safeText(message, "");
    node.classList.add("is-visible");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove("is-visible"), 2600);
  }

  function showModal(title, bodyHtml, onSubmit, submitLabel, note) {
    const root = byId("modalRoot");
    root.innerHTML =
      '<div class="modal-layer" id="modalLayer">' +
        '<div class="modal-card">' +
          '<h3 class="modal-title">' + escapeHtml(title) + '</h3>' +
          (note ? '<p class="modal-copy">' + escapeHtml(note) + "</p>" : "") +
          '<form id="modalForm">' +
            bodyHtml +
            '<div class="modal-actions">' +
              '<button type="button" class="button button--small secondary" id="modalCancelBtn">Cancelar</button>' +
              '<button type="submit" class="button button--small">' + escapeHtml(submitLabel || "Guardar") + "</button>" +
            "</div>" +
          "</form>" +
        "</div>" +
      "</div>";

    const close = function () {
      root.innerHTML = "";
    };

    byId("modalCancelBtn").addEventListener("click", close);
    byId("modalLayer").addEventListener("click", function (event) {
      if (event.target.id === "modalLayer") {
        close();
      }
    });

    byId("modalForm").addEventListener("submit", function (event) {
      event.preventDefault();
      const form = event.currentTarget;
      const data = Object.fromEntries(new FormData(form).entries());
      const result = onSubmit ? onSubmit(data, close) : null;
      if (result !== false) {
        return;
      }
    });
  }

  function closeFineNotice() {
    byId("fineNoticeRoot").innerHTML = "";
    if (!state.open && !state.demo) {
      document.body.style.display = "none";
    }
  }

  function showFineNotice(data) {
    const locationLine = formatFineLocationDisplay(data);
    byId("fineNoticeRoot").innerHTML =
      '<div class="fine-notice" id="fineNotice">' +
        '<div class="fine-notice__card">' +
          "<h3>Citacion Emitida</h3>" +
          '<div class="fine-notice__amount">$' + escapeHtml(data.amount || 0) + "</div>" +
          '<div class="fine-notice__meta">' + escapeHtml(data.charge || "Multa") + "</div>" +
          (locationLine ? '<div class="fine-notice__meta">' + escapeHtml(locationLine) + "</div>" : "") +
          '<div class="fine-notice__meta">Revise sus multas con /fines. Pague con /payfine ' + escapeHtml(data.id || "") + ' cash.</div>' +
        "</div>" +
      "</div>";

    const overlay = byId("fineNotice");
    overlay.addEventListener("click", closeFineNotice);
    document.body.style.display = "flex";
    clearTimeout(showFineNotice.timer);
    showFineNotice.timer = setTimeout(closeFineNotice, 10000);
  }

  function setHeader() {
    byId("departmentName").textContent = state.serverName;
    byId("sealText").textContent = state.departmentSeal;
    byId("officerName").textContent = state.player.name || "Oficial Desconocido";
    byId("officerMeta").textContent = (state.player.rank || "deputy") + " | Nivel " + (state.player.level || 1);
  }

  function setBaseTab(tabName) {
    state.currentTab = tabName;
    document.querySelectorAll(".side-tab").forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.panel === tabName);
    });
  }

  function showPanel(panelName, baseTabName) {
    document.querySelectorAll(".panel").forEach(function (panel) {
      panel.classList.remove("is-active");
    });

    const panel = byId("panel-" + panelName);
    if (panel) {
      panel.classList.add("is-active");
    }

    if (baseTabName) {
      setBaseTab(baseTabName);
    }
  }

  function closeMDT() {
    if (byId("modalLayer")) {
      byId("modalRoot").innerHTML = "";
      return;
    }

    closeFineNotice();
    state.open = false;

    fetch("https://" + RESOURCE_NAME + "/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}"
    }).catch(function () {});

    if (!state.demo) {
      document.body.style.display = "none";
    }
  }

  function nuiFetch(endpoint, data) {
    const payload = data || {};

    if (state.demo) {
      return Promise.resolve(demoResponse(endpoint, payload));
    }

    if (CALLBACK_ENDPOINTS.has(endpoint)) {
      return new Promise(function (resolve, reject) {
        const cbId = Math.floor(Math.random() * 900000) + 100000;
        const type = "cb_" + cbId;
        const timeoutId = setTimeout(function () {
          window.removeEventListener("message", handler);
          reject(new Error("MDT callback timeout"));
        }, 10000);

        function handler(event) {
          if (!event.data || event.data.type !== type) {
            return;
          }

          clearTimeout(timeoutId);
          window.removeEventListener("message", handler);
          resolve(event.data.data);
        }

        window.addEventListener("message", handler);

        fetch("https://" + RESOURCE_NAME + "/" + endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(Object.assign({}, payload, { cbId: cbId }))
        }).catch(function (error) {
          clearTimeout(timeoutId);
          window.removeEventListener("message", handler);
          reject(error);
        });
      });
    }

    return fetch("https://" + RESOURCE_NAME + "/" + endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (response) {
      return response.json();
    }).catch(function () {
      return { ok: true };
    });
  }

  function demoResponse(endpoint, payload) {
    const query = safeText(payload.query || payload.search, "").toLowerCase();
    if (endpoint === "searchIndividuals") {
      return demo.citizens.filter(function (citizen) {
        const haystack = [citizen.firstname, citizen.lastname, citizen.aliases, citizen.affiliations].join(" ").toLowerCase();
        if (!query) {
          return true;
        }
        return haystack.indexOf(query) !== -1;
      });
    }

    if (endpoint === "getIndividual") {
      const citizen = demo.citizens.find(function (row) { return String(row.id) === String(payload.id); }) || demo.citizens[0];
      return Object.assign({}, citizen, {
        charges: [
          { id: 85, charge: "#33032 Austin Wallace: Shooting", officer_name: "Peter Walsh", created_at: "28 Jan 1900 16:06", penal_code: "CP-404", sentence_time: 25, fine: 300, status: "open" }
        ],
        fines: [
          { id: 42, charge: "Disorderly Conduct", amount: 25, status: "pending", created_at: "30 Jan 1900 09:15", state_name: "West Elizabeth", county_name: "Great Plains", town_name: "Blackwater", location_detail: "Frente a la estacion" },
          { id: 31, charge: "Trespassing", amount: 50, status: "paid", created_at: "27 Jan 1900 15:22", state_name: "New Hanover", county_name: "The Heartlands", town_name: "Valentine", location_detail: "" }
        ],
        warrants: demo.wanted.filter(function (row) { return String(row.individual_id) === String(citizen.id); }),
        medical_refs: [
          { id: 91, doc_code: "MED-21", doc_title: "Informe Medico", issued_at: "30 Jan 1900 17:29" }
        ],
        legal_docs: [
          { id: 93, doc_code: "LAW-05", doc_title: "Witness Statement", issued_at: "29 Jan 1900 12:14" }
        ]
      });
    }

    if (endpoint === "getCases") {
      const rows = demo.cases.filter(function (row) {
        const haystack = [row.title, row.summary, row.citizen_name].join(" ").toLowerCase();
        return !query || haystack.indexOf(query) !== -1;
      });
      return { cases: rows, totalCount: rows.length, page: Number(payload.page || 1) };
    }

    if (endpoint === "getCase") {
      const caseRow = demo.cases.find(function (row) { return String(row.id) === String(payload.id); }) || demo.cases[0];
      return Object.assign({}, caseRow, {
        incidents: [
          { title: "Initial Report", location: "Fort Wallace", date: "28 Jan 1900 15:26", details: "Security breach and prisoner escape." }
        ],
        charges: [
          { charge_name: "Armed Robbery", penal_code: "CP-202", fine: 350 }
        ]
      });
    }

    if (endpoint === "getWantedList") {
      return demo.wanted;
    }

    if (endpoint === "getGangs") {
      return demo.gangs.map(function (gang) {
        return Object.assign({}, gang, { members: undefined });
      });
    }

    if (endpoint === "getGang") {
      return demo.gangs.find(function (row) { return String(row.id) === String(payload.id); }) || demo.gangs[0];
    }

    if (endpoint === "getDashboardStats") {
      return {
        totalIndividuals: 5,
        wantedCount: 3,
        activeWarrants: 3,
        openCharges: 6,
        gangCount: 5,
        weekActivity: 8
      };
    }

    if (endpoint === "getRecentActivity") {
      return demo.activity;
    }

    if (endpoint === "getInbox" || endpoint === "getOutbox") {
      return demo.telegraphs;
    }

    if (endpoint === "getOfficersList") {
      return [
        { identifier: "marshal-1", name: "Peter Walsh", rank: "marshal" },
        { identifier: "judge-2", name: "Micah Moore", rank: "judge" }
      ];
    }

    return { ok: true };
  }

  function renderEmpty(targetId, message) {
    byId(targetId).innerHTML = '<div class="empty-state">' + escapeHtml(message) + "</div>";
  }

  function citizenSummary(entry) {
    if (safeText(entry.description, "")) {
      return truncate(entry.description, 180);
    }
    if (!entry.hasFile) {
      return "Personaje registrado en el servidor, listo para abrir su ficha en el despacho.";
    }
    return "Sin observaciones asentadas.";
  }

  function openCitizenEntry(entry) {
    if (!entry) {
      return;
    }

    if (entry.hasFile && (entry.individual_id || entry.id)) {
      openCitizenProfile(entry.individual_id || entry.id);
      return;
    }

    openCitizenModal({
      firstname: entry.firstname || "",
      lastname: entry.lastname || "",
      identifier: entry.identifier || "",
      char_id: entry.char_id || "",
      job: entry.job || "",
      source: entry.source || "character",
      description: entry.description || "",
      affiliations: entry.affiliations || "",
      aliases: entry.aliases || ""
    });
  }

  function activityActionLabel(action) {
    const labels = {
      created: "asento",
      updated: "actualizo",
      signed: "firmo",
      executed: "ejecuto",
      cancelled: "cancelo",
      archived: "archivo",
      sent: "despacho",
      issue_fine: "impuso",
      issued_fine: "impuso",
      fine_paid: "registro pago de"
    };
    return labels[String(action || "").toLowerCase()] || safeText(action, "actualizo");
  }

  function activityTargetLabel(target) {
    const labels = {
      individual: "ficha ciudadana",
      case: "expediente",
      warrant: "orden",
      charge: "cargo",
      gang: "banda",
      telegram: "telegrama",
      fine: "multa",
      record: "registro"
    };
    return labels[String(target || "").toLowerCase()] || safeText(target, "registro");
  }

  function renderCitizens(rows) {
    const target = byId("citizenList");
    if (!rows || rows.length === 0) {
      target.innerHTML = '<div class="empty-state">No se hallaron fichas ciudadanas en el registro.</div>';
      return;
    }

    target.innerHTML = rows.map(function (citizen, index) {
      const sourceLabel = citizen.hasFile ? "FICHA MDT" : "PERSONAJE DEL SERVIDOR";
      const statusText = citizen.hasFile
        ? statusLabel(citizen.status || "clear")
        : ("CHAR ID " + escapeHtml(citizen.char_id || citizen.identifier || "N/D"));
      return (
        '<article class="registry-row' + (citizen.hasFile ? "" : " registry-row--pending") + '" data-citizen-index="' + escapeHtml(index) + '">' +
          '<div class="portrait">' + renderPhoto(citizen.image_url, "portrait-placeholder") + "</div>" +
          '<div class="registry-copy">' +
            '<div class="registry-meta">' +
              '<span class="registry-source-badge' + (citizen.hasFile ? "" : " registry-source-badge--pending") + '">' + escapeHtml(sourceLabel) + "</span>" +
              '<span class="registry-reference">' + escapeHtml(statusText) + "</span>" +
            "</div>" +
            '<h3 class="registry-title">' + escapeHtml(citizen.firstname + " " + citizen.lastname) +
              (citizen.status === "wanted" || citizen.status === "dangerous" ? ' <span class="status-badge">[' + escapeHtml(statusLabel(citizen.status)) + "]</span>" : "") +
            "</h3>" +
            '<div class="soft-text registry-summary">' + escapeHtml(citizenSummary(citizen)) + "</div>" +
          "</div>" +
        "</article>"
      );
    }).join("");

    target.querySelectorAll("[data-citizen-index]").forEach(function (node) {
      node.addEventListener("click", function () {
        openCitizenEntry(rows[Number(node.dataset.citizenIndex)]);
      });
    });
  }

  function loadCitizens() {
    setLoading("citizenList", "Buscando registros...");
    nuiFetch("searchIndividuals", { query: byId("citizenSearch").value || "" }).then(function (rows) {
      let filtered = rows || [];
      const statusFilter = byId("citizenStatusFilter").value || "";

      if (statusFilter) {
        filtered = filtered.filter(function (citizen) {
          return String(citizen.status || "").toLowerCase() === statusFilter;
        });
      }

      state.citizens = filtered;
      renderCitizens(filtered);
    }).catch(function () {
      renderEmpty("citizenList", "No fue posible abrir el registro ciudadano.");
    });
  }

  function detailTable(rows, columns, emptyMessage) {
    if (!rows || rows.length === 0) {
      return '<div class="empty-state">' + escapeHtml(emptyMessage) + "</div>";
    }

    return (
      '<table class="simple-table"><thead><tr>' +
      columns.map(function (column) {
        return "<th>" + escapeHtml(column.label) + "</th>";
      }).join("") +
      "</tr></thead><tbody>" +
      rows.map(function (row) {
        return "<tr>" + columns.map(function (column) {
          return '<td class="' + escapeHtml(column.className || "") + '">' + escapeHtml(row[column.key] == null ? "" : row[column.key]) + "</td>";
        }).join("") + "</tr>";
      }).join("") +
      "</tbody></table>"
    );
  }

  function renderCitizenProfile(citizen) {
    const wanted = citizen.warrants && citizen.warrants.length > 0 ? citizen.warrants[0] : null;
    const created = safeText(citizen.created_at, "Desconocida");
    const updated = safeText(citizen.updated_at, "Desconocida");
    const currentJob = safeText(citizen.currentJob || citizen.job, "Sin oficio asentado");
    const onlineLabel = citizen.online ? "En servicio / conectado" : "Fuera de servicio";
    const fineRows = (citizen.fines || []).map(function (fine) {
      return {
        id: fine.id,
        charge: fine.charge,
        jurisdiction: formatFineLocationDisplay(fine),
        amount: "$" + Number(fine.amount || 0),
        status: statusLabel(fine.status),
        created_at: fine.created_at
      };
    });
    const outstandingTotal = (citizen.fines || []).reduce(function (total, fine) {
      const status = String(fine.status || "").toLowerCase();
      if (status === "pending" || status === "overdue") {
        return total + Number(fine.amount || 0);
      }
      return total;
    }, 0);

    const html =
      '<div class="profile-shell">' +
        '<div class="profile-bar">' +
          '<div class="profile-name">' + escapeHtml(citizen.firstname + " " + citizen.lastname) +
            (citizen.status === "wanted" ? ' <span class="status-badge">[BUSCADO]</span>' : citizen.status === "dangerous" ? ' <span class="status-badge">[PELIGROSO]</span>' : "") +
          "</div>" +
          '<div class="profile-id">' + escapeHtml(citizen.id) + "</div>" +
        "</div>" +

        '<div class="profile-top">' +
          '<div class="profile-portrait">' + renderPhoto(citizen.image_url, "portrait-placeholder") + "</div>" +
          '<div class="profile-data">' +
            '<table class="profile-table">' +
              "<tr><td>Nombre</td><td>" + escapeHtml(citizen.firstname + " " + citizen.lastname) + "</td></tr>" +
              "<tr><td>Alias</td><td>" + escapeHtml(safeText(citizen.aliases, "-")) + "</td></tr>" +
              "<tr><td>Afiliaciones</td><td>" + escapeHtml(safeText(citizen.affiliations, "-")) + "</td></tr>" +
              "<tr><td>Telegram</td><td>" + escapeHtml(safeText(citizen.telegram, "-")) + "</td></tr>" +
              "<tr><td>ID Personaje</td><td>" + escapeHtml(safeText(citizen.char_id, "No vinculado")) + "</td></tr>" +
              "<tr><td>Oficio Actual</td><td>" + escapeHtml(currentJob) + "</td></tr>" +
              "<tr><td>Conexion</td><td>" + escapeHtml(onlineLabel) + "</td></tr>" +
            "</table>" +
            '<div class="profile-actions">' +
              '<button class="button" id="profileArrestReportBtn" type="button">Reporte de Arresto</button>' +
              '<button class="button" id="profileWarrantBtn" type="button">Crear Orden</button>' +
              '<button class="button" id="profileFineBtn" type="button">Emitir Multa</button>' +
              '<button class="button" id="profileMedicalBtn" type="button">Informe Medico</button>' +
              '<button class="button" id="profileChargeBtn" type="button">Agregar Cargo</button>' +
            "</div>" +
            '<div class="profile-meta">' +
              "<div>Fuente: <strong>Ficha MDT</strong></div>" +
              "<div>Creado: <strong>" + escapeHtml(created) + "</strong></div>" +
              "<div>Actualizado: <strong>" + escapeHtml(updated) + "</strong></div>" +
            "</div>" +
          "</div>" +
        "</div>" +

        (wanted ? (
          '<div class="section-block">' +
            '<h3>Orden de Arresto</h3>' +
            '<div class="alert-warrant">Este ciudadano figura como buscado en conexion con una orden de arresto</div>' +
            '<table class="profile-table">' +
              "<tr><td>Titulo</td><td>" + escapeHtml(wanted.title) + "</td></tr>" +
              "<tr><td>Emitida</td><td>" + escapeHtml(wanted.created_at) + "</td></tr>" +
            "</table>" +
          "</div>"
        ) : "") +

        '<div class="section-block">' +
          "<h3>Notas</h3>" +
          '<div class="soft-text">' + escapeHtml(safeText(citizen.notes || citizen.description, "No hay notas asentadas.")) + "</div>" +
          (safeText(citizen.known_associates, "") !== "" ? '<div class="soft-text" style="margin-top:10px"><strong>Se le conoce junto a:</strong> ' + escapeHtml(citizen.known_associates) + "</div>" : "") +
        "</div>" +

        '<div class="section-block">' +
          "<h3>Historial Criminal</h3>" +
          detailTable(citizen.charges || [], [
            { label: "ID", key: "id", className: "record-id" },
            { label: "Cargo", key: "charge" },
            { label: "Oficial", key: "officer_name" },
            { label: "Fecha", key: "created_at" }
          ], "No hay historial criminal asentado.") +
        "</div>" +

        '<div class="section-block">' +
          "<h3>Registro Medico</h3>" +
          detailTable(citizen.medical_refs || [], [
            { label: "ID", key: "id", className: "record-id" },
            { label: "Titulo", key: "doc_title" },
            { label: "Codigo", key: "doc_code" },
            { label: "Fecha", key: "issued_at" }
          ], "No hay informes medicos asentados.") +
        "</div>" +

        '<div class="section-block">' +
          "<h3>Registro de Multas</h3>" +
          detailTable(fineRows, [
            { label: "ID", key: "id", className: "record-id" },
            { label: "Cargo", key: "charge" },
            { label: "Jurisdiccion", key: "jurisdiction" },
            { label: "Monto", key: "amount" },
            { label: "Estado", key: "status" },
            { label: "Fecha", key: "created_at" }
          ], "No hay multas asentadas.") +
          '<div class="soft-text" style="margin-top:8px"><strong>Pendiente por pagar:</strong> $' + escapeHtml(outstandingTotal) + "</div>" +
        "</div>" +

        '<div class="section-block">' +
          "<h3>Documentos Legales</h3>" +
          detailTable(citizen.legal_docs || [], [
            { label: "ID", key: "id", className: "record-id" },
            { label: "Titulo", key: "doc_title" },
            { label: "Codigo", key: "doc_code" },
            { label: "Fecha", key: "issued_at" }
          ], "No hay documentos legales asentados.") +
        "</div>" +
      "</div>";

    byId("profileContent").innerHTML = html;
    byId("profileArrestReportBtn").addEventListener("click", function () {
      openCaseModal("arrest_report", citizen);
    });
    byId("profileFineBtn").addEventListener("click", function () {
      openFineModal(citizen);
    });
    byId("profileMedicalBtn").addEventListener("click", function () {
      openCaseModal("medical_report", citizen);
    });
    byId("profileWarrantBtn").addEventListener("click", function () {
      openWarrantModal(citizen);
    });
    byId("profileChargeBtn").addEventListener("click", function () {
      openChargeModal(citizen);
    });
  }

  function openCitizenProfile(id) {
    renderEmpty("profileContent", "Abriendo ficha ciudadana...");
    nuiFetch("getIndividual", { id: id }).then(function (citizen) {
      state.currentCitizen = citizen;
      renderCitizenProfile(citizen);
      showPanel("profile", "citizens");
    }).catch(function () {
      toast("No fue posible abrir la ficha ciudadana.");
    });
  }

  function renderCaseRows(rows, totalCount, page) {
    state.caseRows = rows || [];
    state.caseTotal = Number(totalCount || 0);
    state.casePage = Number(page || 1);

    if (!rows || rows.length === 0) {
      byId("caseTableWrap").innerHTML = '<div class="empty-state">No se hallaron reportes archivados.</div>';
      byId("casePageLabel").textContent = "Pagina 1 de 1";
      return;
    }

    byId("caseTableWrap").innerHTML =
      '<table class="case-table">' +
        "<thead><tr><th>ID</th><th>Titulo</th><th>Tipo</th><th>Estado</th><th>Ciudadano</th><th>Ultima Actualizacion</th></tr></thead>" +
        "<tbody>" +
          rows.map(function (row) {
            return (
              '<tr data-case-id="' + escapeHtml(row.id) + '">' +
                '<td class="record-id">' + escapeHtml(row.id) + "</td>" +
                "<td>" + escapeHtml(row.title) + '<div class="soft-text">' + escapeHtml(truncate(row.summary, 90)) + "</div></td>" +
                '<td><span class="case-type">' + escapeHtml(caseTypeLabel(row.case_type)) + "</span></td>" +
                '<td><span class="case-state" data-state="' + escapeHtml(String(row.state || "").toLowerCase()) + '">' + escapeHtml(statusLabel(row.state)) + "</span></td>" +
                "<td>" + escapeHtml(safeText(row.citizen_name, "-")) + "</td>" +
                "<td>" + escapeHtml(safeText(row.updated_at, row.created_at || "-")) + "</td>" +
              "</tr>"
            );
          }).join("") +
        "</tbody>" +
      "</table>";

    byId("casePageLabel").textContent = "Pagina " + state.casePage + " de " + Math.max(1, Math.ceil(state.caseTotal / 10));

    byId("caseTableWrap").querySelectorAll("[data-case-id]").forEach(function (row) {
      row.addEventListener("click", function () {
        openCaseDetail(row.dataset.caseId);
      });
    });
  }

  function loadCases(page) {
    const filters = {
      search: byId("caseSearch").value || "",
      caseType: byId("caseTypeFilter").value || "",
      state: byId("caseStateFilter").value || ""
    };

    setLoading("caseTableWrap", "Abriendo el archivo...");
    nuiFetch("getCases", { filters: filters, page: page || 1 }).then(function (result) {
      renderCaseRows(result.cases || [], result.totalCount || 0, result.page || 1);
    }).catch(function () {
      byId("caseTableWrap").innerHTML = '<div class="empty-state">No fue posible abrir el archivo.</div>';
    });
  }

  function renderCaseDetail(caseRow) {
    const incidents = detailTable(caseRow.incidents || [], [
      { label: "Titulo", key: "title" },
      { label: "Lugar", key: "location" },
      { label: "Fecha", key: "date" },
      { label: "Detalles", key: "details" }
    ], "No hay incidentes asentados.");

    const charges = detailTable(caseRow.charges || [], [
      { label: "Cargo", key: "charge_name" },
      { label: "Codigo", key: "penal_code" },
      { label: "Multa", key: "fine" }
    ], "No hay cargos asentados.");

    byId("caseDetailContent").innerHTML =
      '<div class="section-block">' +
        "<h3>" + escapeHtml(caseRow.title) + "</h3>" +
        '<div class="soft-text"><strong>Tipo:</strong> ' + escapeHtml(caseTypeLabel(caseRow.case_type)) +
          ' | <strong>Estado:</strong> ' + escapeHtml(statusLabel(caseRow.state)) +
          ' | <strong>Ciudadano:</strong> ' + escapeHtml(safeText(caseRow.citizen_name, "-")) + "</div>" +
        '<div class="soft-text" style="margin-top:8px">' + escapeHtml(safeText(caseRow.content || caseRow.summary, "No hay cuerpo de reporte asentado.")) + "</div>" +
      "</div>" +
      '<div class="section-block"><h3>Incidentes</h3>' + incidents + "</div>" +
      '<div class="section-block"><h3>Cargos</h3>' + charges + "</div>";
  }

  function openCaseDetail(id) {
    nuiFetch("getCase", { id: id }).then(function (caseRow) {
      state.currentCase = caseRow;
      renderCaseDetail(caseRow);
      showPanel("case", "filing");
    }).catch(function () {
      toast("No fue posible abrir el expediente.");
    });
  }

  function renderWanted(rows) {
    state.wantedRows = rows || [];
    const target = byId("wantedGrid");

    if (!rows || rows.length === 0) {
      target.innerHTML = '<div class="empty-state">No hay carteles activos clavados al tablero.</div>';
      return;
    }

    target.innerHTML = rows.map(function (row) {
      return (
        '<article class="wanted-card">' +
          '<div class="wanted-card__header">Buscado</div>' +
          '<div class="wanted-photo">' + renderPhoto(row.image_url, "portrait-placeholder") + "</div>" +
          '<h3 class="wanted-name">' + escapeHtml(row.firstname + " " + row.lastname) + "</h3>" +
          '<div class="wanted-notes">' + escapeHtml(safeText(row.charges || row.title, "Sin resumen de cargos.")) + "</div>" +
          '<div class="wanted-bounty">$' + escapeHtml(row.bounty || 0) + "</div>" +
          '<div class="wanted-notes">' + escapeHtml(statusLabel(row.danger_level)) + " | " + escapeHtml(statusLabel(row.status)) + "</div>" +
          '<div class="wanted-actions">' +
            (String(row.status) === "pending" ? '<button class="button button--small" data-sign="' + escapeHtml(row.id) + '" type="button">Firmar</button>' : "") +
            (String(row.status) === "active" ? '<button class="button button--small" data-execute="' + escapeHtml(row.id) + '" type="button">Ejecutar</button>' : "") +
            '<button class="button button--small button--danger" data-cancel="' + escapeHtml(row.id) + '" type="button">Cancelar</button>' +
          "</div>" +
        "</article>"
      );
    }).join("");

    target.querySelectorAll("[data-sign]").forEach(function (button) {
      button.addEventListener("click", function () {
        nuiFetch("signWarrant", { warrantId: button.dataset.sign }).then(function () {
          toast("Orden firmada.");
          loadWanted();
        });
      });
    });

    target.querySelectorAll("[data-execute]").forEach(function (button) {
      button.addEventListener("click", function () {
        nuiFetch("executeWarrant", { warrantId: button.dataset.execute }).then(function () {
          toast("Orden ejecutada.");
          loadWanted();
        });
      });
    });

    target.querySelectorAll("[data-cancel]").forEach(function (button) {
      button.addEventListener("click", function () {
        showModal(
          "Cancelar Orden",
          '<div class="form-grid"><div class="form-row"><label>Motivo</label><textarea class="form-textarea" name="reason"></textarea></div></div>',
          function (data, close) {
            nuiFetch("cancelWarrant", { warrantId: button.dataset.cancel, reason: data.reason || "Cancelada desde el MDT" }).then(function () {
              close();
              toast("Orden cancelada.");
              loadWanted();
            });
          },
          "Cancelar Orden"
        );
      });
    });
  }

  function loadWanted() {
    setLoading("wantedGrid", "Clavando carteles al tablero...");
    nuiFetch("getWantedList", {}).then(renderWanted).catch(function () {
      renderEmpty("wantedGrid", "No fue posible abrir los carteles de captura.");
    });
  }

  function renderGangList(rows) {
    state.gangRows = rows || [];
    const target = byId("gangList");

    if (!rows || rows.length === 0) {
      target.innerHTML = '<div class="empty-state">No hay expedientes de bandas asentados.</div>';
      byId("gangDetail").innerHTML = '<p>Seleccione una banda para revisar su expediente.</p>';
      return;
    }

    target.innerHTML = rows.map(function (gang) {
      return (
        '<article class="gang-row" data-gang-id="' + escapeHtml(gang.id) + '">' +
          '<div class="threat-bar" data-level="' + escapeHtml(String(gang.threat_level || "").toLowerCase()) + '"></div>' +
          '<div class="gang-copy">' +
            '<h3 class="gang-title">' + escapeHtml(gang.name) + "</h3>" +
            '<div class="gang-meta">' + escapeHtml(safeText(gang.territory, "Territorio sin fijar")) + " | " + escapeHtml(statusLabel(gang.status)) + "</div>" +
            '<div class="soft-text">' + escapeHtml(truncate(gang.description, 110)) + "</div>" +
          "</div>" +
          '<div class="gang-count">' + escapeHtml(gang.member_count || 0) + '<div class="gang-meta">Miembros</div></div>' +
        "</article>"
      );
    }).join("");

    target.querySelectorAll("[data-gang-id]").forEach(function (row) {
      row.addEventListener("click", function () {
        openGangDetail(row.dataset.gangId);
      });
    });
  }

  function renderGangDetail(gang) {
    byId("gangDetail").innerHTML =
      '<div class="detail-card">' +
        "<h3>" + escapeHtml(gang.name) + "</h3>" +
        '<div class="soft-text"><strong>Alias:</strong> ' + escapeHtml(safeText(gang.alias, "-")) + "</div>" +
        '<div class="soft-text"><strong>Territorio:</strong> ' + escapeHtml(safeText(gang.territory, "-")) + "</div>" +
        '<div class="soft-text"><strong>Nivel de Amenaza:</strong> ' + escapeHtml(statusLabel(gang.threat_level)) + "</div>" +
        '<div class="soft-text" style="margin-top:8px">' + escapeHtml(safeText(gang.description, "No hay descripcion asentada.")) + "</div>" +
        '<div class="section-block" style="padding-left:0;padding-right:0;border-bottom:0;margin-top:8px">' +
          "<h3>Plantilla</h3>" +
          detailTable(gang.members || [], [
            { label: "Nombre", key: "firstname" },
            { label: "Apellido", key: "lastname" },
            { label: "Rol", key: "role" },
            { label: "Estado", key: "individual_status" }
          ], "No hay miembros asentados.") +
        "</div>" +
      "</div>";
  }

  function openGangDetail(id) {
    byId("gangDetail").innerHTML = '<div class="detail-card detail-card--empty"><p>Abriendo expediente de banda...</p></div>';
    nuiFetch("getGang", { id: id }).then(function (gang) {
      state.currentGang = gang;
      renderGangDetail(gang);
    }).catch(function () {
      toast("No fue posible abrir el expediente de la banda.");
    });
  }

  function loadGangs() {
    setLoading("gangList", "Revisando expedientes de bandas...");
    byId("gangDetail").innerHTML = '<div class="detail-card detail-card--empty"><p>Seleccione una banda para revisar su expediente.</p></div>';
    nuiFetch("getGangs", {}).then(function (rows) {
      renderGangList(rows || []);
      if (rows && rows[0]) {
        openGangDetail(rows[0].id);
      }
    }).catch(function () {
      renderEmpty("gangList", "No fue posible abrir los expedientes de bandas.");
    });
  }

  function renderDashboard(stats, activity) {
    const cards = [
      ["Ciudadanos", stats.totalIndividuals],
      ["Buscados", stats.wantedCount],
      ["Ordenes Activas", stats.activeWarrants],
      ["Cargos Abiertos", stats.openCharges],
      ["Bandas", stats.gangCount],
      ["Actividad (7d)", stats.weekActivity]
    ];

    byId("dashboardStats").innerHTML = cards.map(function (entry) {
      return (
        '<article class="stat-card">' +
          '<span class="stat-value">' + escapeHtml(entry[1] == null ? 0 : entry[1]) + "</span>" +
          '<div class="stat-label">' + escapeHtml(entry[0]) + "</div>" +
        "</article>"
      );
    }).join("");

    if (!activity || activity.length === 0) {
      byId("dashboardActivity").innerHTML = '<div class="empty-state">No hay actividad reciente asentada en la libreta.</div>';
      return;
    }

    byId("dashboardActivity").innerHTML = activity.map(function (entry) {
      return (
        '<div class="activity-row">' +
          '<div class="activity-time">' + escapeHtml(safeText(entry.created_at, "-")) + "</div>" +
          '<div class="soft-text"><span class="activity-officer">' + escapeHtml(safeText(entry.officer_name, "Oficial Desconocido")) + "</span> " +
            escapeHtml(activityActionLabel(entry.action)) + " " + escapeHtml(activityTargetLabel(entry.target_type)) +
            (safeText(entry.details, "") ? ' <span class="soft-text">(' + escapeHtml(entry.details) + ")</span>" : "") +
          "</div>" +
        "</div>"
      );
    }).join("");
  }

  function loadDashboard() {
    byId("dashboardStats").innerHTML = '<div class="empty-state empty-state--loading">Abriendo panel del despacho...</div>';
    byId("dashboardActivity").innerHTML = "";
    Promise.all([
      nuiFetch("getDashboardStats", {}),
      nuiFetch("getRecentActivity", {})
    ]).then(function (results) {
      renderDashboard(results[0] || {}, results[1] || []);
    }).catch(function () {
      byId("dashboardStats").innerHTML = "";
      byId("dashboardActivity").innerHTML = '<div class="empty-state">No fue posible abrir el panel del despacho.</div>';
    });
  }

  function renderTelegrams(rows) {
    const target = byId("telegramList");
    if (!rows || rows.length === 0) {
      target.innerHTML = '<div class="empty-state">No hay telegramas aguardando en el despacho.</div>';
      return;
    }

    target.innerHTML = rows.map(function (row) {
      const unread = !row.read_at && state.telegramMode === "inbox";
      const fromName = state.telegramMode === "outbox" ? safeText(row.to_name || row.to_identifier, "Destinatario Desconocido") : safeText(row.from_name, "Remitente Desconocido");
      return (
        '<article class="telegram-row' + (unread ? " is-unread" : "") + '" data-telegram-id="' + escapeHtml(row.id) + '">' +
          '<div class="telegram-flag">' + (row.urgent ? "!" : "") + "</div>" +
          '<div class="telegram-copy">' +
            '<div class="telegram-subject">' + escapeHtml(row.subject) + "</div>" +
            '<div class="soft-text">' + escapeHtml(fromName) + "</div>" +
            '<div class="telegram-body">' + escapeHtml(truncate(row.body, 160)) + "</div>" +
          "</div>" +
          '<div class="telegram-meta">' + escapeHtml(safeText(row.created_at, "-")) + "</div>" +
        "</article>"
      );
    }).join("");

    target.querySelectorAll("[data-telegram-id]").forEach(function (row) {
      row.addEventListener("click", function () {
        const telegram = rows.find(function (entry) {
          return String(entry.id) === String(row.dataset.telegramId);
        });

        if (!telegram) {
          return;
        }

        showModal(
          telegram.subject,
          '<div class="form-grid">' +
            '<div class="soft-text"><strong>De:</strong> ' + escapeHtml(safeText(telegram.from_name, "-")) + "</div>" +
            '<div class="soft-text"><strong>Para:</strong> ' + escapeHtml(safeText(telegram.to_name || telegram.to_identifier, "-")) + "</div>" +
            '<div class="soft-text"><strong>Fecha:</strong> ' + escapeHtml(safeText(telegram.created_at, "-")) + "</div>" +
            '<div class="section-block" style="padding-left:0;padding-right:0;border-bottom:0"><div class="soft-text">' + escapeHtml(safeText(telegram.body, "")) + "</div></div>" +
          "</div>",
          function (_, close) {
            close();
          },
          "Cerrar"
        );

        if (state.telegramMode === "inbox") {
          nuiFetch("markTelegramRead", { telegramId: telegram.id }).then(function () {
            loadTelegrams("inbox");
          });
        }
      });
    });
  }

  function loadTelegrams(mode) {
    state.telegramMode = mode || state.telegramMode;
    const endpoint = state.telegramMode === "outbox" ? "getOutbox" : "getInbox";

    setLoading("telegramList", "Revisando linea de avisos...");
    nuiFetch(endpoint, {}).then(function (rows) {
      renderTelegrams(rows || []);
    }).catch(function () {
      renderEmpty("telegramList", "No fue posible abrir la linea de avisos.");
    });
  }

  function caseTypeOptions() {
    const source = state.caseTypes && state.caseTypes.length ? state.caseTypes : [
      { id: "case_file", label: "Expediente" },
      { id: "arrest_report", label: "Reporte de Arresto" },
      { id: "arrest_warrant", label: "Orden de Arresto" },
      { id: "medical_report", label: "Informe Medico" },
      { id: "citation", label: "Citacion" },
      { id: "incident", label: "Reporte de Incidente" }
    ];

    return source.map(function (row) {
      return '<option value="' + escapeHtml(row.id) + '">' + escapeHtml(row.label) + "</option>";
    }).join("");
  }

  function caseStateOptions() {
    const source = state.caseStates && state.caseStates.length ? state.caseStates : [
      { id: "open", label: "Abierto" },
      { id: "ongoing", label: "En curso" },
      { id: "complete", label: "Completo" },
      { id: "archived", label: "Archivado" }
    ];

    return source.map(function (row) {
      return '<option value="' + escapeHtml(row.id) + '">' + escapeHtml(row.label) + "</option>";
    }).join("");
  }

  function refreshCaseFilterOptions() {
    byId("caseTypeFilter").innerHTML = '<option value="">Todos los Tipos</option>' + caseTypeOptions();
    byId("caseStateFilter").innerHTML = '<option value="">Todos los Estados</option>' + caseStateOptions();
  }

  function openCitizenModal(initialValues, citizenId) {
    const values = initialValues || {};
    const linkedCharacter = !citizenId && values.char_id;
    const modalTitle = citizenId
      ? "Editar Ciudadano"
      : linkedCharacter
        ? "Procesar Personaje del Servidor"
        : "Agregar Ciudadano";
    const citizenNote = linkedCharacter
      ? ("Personaje enlazado al servidor. Char ID " + safeText(values.char_id, "") + (safeText(values.job, "") ? " | Oficio actual: " + values.job : ""))
      : "";
    showModal(
      modalTitle,
      '<div class="form-grid form-grid--two">' +
        '<div class="form-row"><label>Nombre</label><input class="form-input" name="firstname" value="' + escapeHtml(values.firstname || "") + '"></div>' +
        '<div class="form-row"><label>Apellido</label><input class="form-input" name="lastname" value="' + escapeHtml(values.lastname || "") + '"></div>' +
        '<div class="form-row"><label>Identificador</label><input class="form-input" name="identifier" value="' + escapeHtml(values.identifier || "") + '" ' + (linkedCharacter ? "readonly" : "") + '></div>' +
        '<div class="form-row"><label>Fecha de Nacimiento</label><input class="form-input" name="dob" value="' + escapeHtml(values.dob || "") + '"></div>' +
        (linkedCharacter ? '<div class="form-row"><label>ID del Personaje</label><input class="form-input" name="char_id" value="' + escapeHtml(values.char_id || "") + '" readonly></div>' : "") +
        (linkedCharacter ? '<div class="form-row"><label>Oficio del Servidor</label><input class="form-input" name="job_display" value="' + escapeHtml(values.job || "") + '" readonly></div>' : "") +
      "</div>" +
      '<div class="form-grid">' +
        '<div class="form-row"><label>Alias</label><input class="form-input" name="aliases" value="' + escapeHtml(values.aliases || "") + '"></div>' +
        '<div class="form-row"><label>Afiliaciones</label><input class="form-input" name="affiliations" value="' + escapeHtml(values.affiliations || "") + '"></div>' +
        '<div class="form-row"><label>Telegram</label><input class="form-input" name="telegram" value="' + escapeHtml(values.telegram || "") + '"></div>' +
        '<div class="form-row"><label>Notas</label><textarea class="form-textarea" name="notes">' + escapeHtml(values.notes || values.description || "") + "</textarea></div>" +
      "</div>",
      function (data, close) {
        if (!safeText(data.firstname, "") || !safeText(data.lastname, "")) {
          toast("Debe indicar nombre y apellido.");
          return false;
        }

        const payload = {
          firstname: data.firstname,
          lastname: data.lastname,
          identifier: data.identifier,
          char_id: data.char_id || values.char_id || "",
          dob: data.dob,
          aliases: data.aliases,
          affiliations: data.affiliations,
          telegram: data.telegram,
          notes: data.notes,
          description: data.notes
        };

        const action = citizenId
          ? nuiFetch("updateIndividual", { id: citizenId, payload: payload })
          : nuiFetch("createIndividual", payload);

        action.then(function () {
          close();
          toast(citizenId ? "Ficha ciudadana actualizada." : "Solicitud de ficha remitida al despacho.");
          loadCitizens();
          if (citizenId) {
            openCitizenProfile(citizenId);
          }
        });
      },
      citizenId ? "Actualizar" : "Asentar Ficha",
      citizenNote
    );
  }

  function openChargeModal(citizen) {
    const penalCatalog = getPenalCatalog();
    const categoryOptions = ['<option value="">Ingreso Manual</option>'].concat(penalCatalog.map(function (category) {
      return '<option value="' + escapeHtml(category.key) + '">' + escapeHtml(category.label) + "</option>";
    })).join("");

    showModal(
      "Agregar Cargo",
      '<div class="form-grid form-grid--two">' +
        '<div class="form-row"><label>Categoria Penal</label><select class="form-select" name="categoryKey" id="chargeCategorySelect">' + categoryOptions + '</select></div>' +
        '<div class="form-row"><label>Articulo</label><select class="form-select" name="articleCode" id="chargeArticleSelect"><option value="">Seleccione un articulo</option></select></div>' +
        '<div class="form-row"><label>Cargo</label><input class="form-input" name="charge"></div>' +
        '<div class="form-row"><label>Codigo Penal</label><input class="form-input" name="penalCode"></div>' +
        '<div class="form-row"><label>Tiempo de Condena</label><input class="form-input" name="sentenceTime" type="number" min="0"></div>' +
        '<div class="form-row"><label>Multa</label><input class="form-input" name="fine" type="number" min="0"></div>' +
      "</div>" +
      '<div class="form-grid"><div class="form-row"><label>Descripcion</label><textarea class="form-textarea" name="description"></textarea></div></div>',
      function (data, close) {
        if (!safeText(data.charge, "")) {
          toast("Debe indicar un cargo.");
          return false;
        }

        const selectedArticle = getPenalArticleByCode(data.articleCode || data.penalCode);
        nuiFetch("addCharge", {
          individualId: citizen.id,
          charge: data.charge,
          penalCode: data.penalCode,
          sentenceTime: Number(data.sentenceTime || 0),
          fine: Number(data.fine || 0),
          description: data.description,
          plea: "no_plea",
          category: selectedArticle ? selectedArticle.category : ""
        }).then(function () {
          close();
          toast("Cargo asentado en el registro.");
          openCitizenProfile(citizen.id);
        });
      },
      "Asentar Cargo",
      citizen.firstname + " " + citizen.lastname
    );

    const categorySelect = document.getElementById("chargeCategorySelect");
    const articleSelect = document.getElementById("chargeArticleSelect");
    const chargeInput = document.querySelector('#modalRoot input[name="charge"]');
    const penalCodeInput = document.querySelector('#modalRoot input[name="penalCode"]');
    const sentenceInput = document.querySelector('#modalRoot input[name="sentenceTime"]');
    const fineInput = document.querySelector('#modalRoot input[name="fine"]');
    const descriptionInput = document.querySelector('#modalRoot textarea[name="description"]');

    function fillArticles(categoryKey) {
      const category = penalCatalog.find(function (entry) {
        return entry.key === categoryKey;
      });

      const options = ['<option value="">Seleccione un articulo</option>'];
      if (category) {
        category.charges.forEach(function (article) {
          options.push('<option value="' + escapeHtml(article.code) + '">' + escapeHtml(article.code + " - " + article.name) + "</option>");
        });
      }
      articleSelect.innerHTML = options.join("");
    }

    function applyArticle(code) {
      const article = getPenalArticleByCode(code);
      if (!article) {
        return;
      }

      chargeInput.value = safeText(article.name, "");
      penalCodeInput.value = safeText(article.code, "");
      sentenceInput.value = Number(article.time || 0);
      fineInput.value = Number(article.fine || 0);
      descriptionInput.value = safeText(article.description, "");
    }

    if (categorySelect && articleSelect) {
      categorySelect.addEventListener("change", function () {
        fillArticles(categorySelect.value);
      });
      articleSelect.addEventListener("change", function () {
        applyArticle(articleSelect.value);
      });
    }
  }

  function openFineModal(citizen) {
    const penalCatalog = getPenalCatalog();
    const categoryOptions = ['<option value="">Ingreso Manual</option>'].concat(penalCatalog.map(function (category) {
      return '<option value="' + escapeHtml(category.key) + '">' + escapeHtml(category.label) + "</option>";
    })).join("");

    showModal(
      "Emitir Multa",
      '<div class="form-grid form-grid--two">' +
        '<div class="form-row"><label>Categoria Penal</label><select class="form-select" name="categoryKey" id="fineCategorySelect">' + categoryOptions + '</select></div>' +
        '<div class="form-row"><label>Articulo</label><select class="form-select" name="articleCode" id="fineArticleSelect"><option value="">Seleccione un articulo</option></select></div>' +
        '<div class="form-row"><label>Cargo</label><input class="form-input" name="charge"></div>' +
        '<div class="form-row"><label>Codigo Penal</label><input class="form-input" name="penalCode"></div>' +
        '<div class="form-row"><label>Monto</label><input class="form-input" name="amount" type="number" min="1"></div>' +
        '<div class="form-row"><label>Estado/Territorio</label><select class="form-select" name="stateName" id="fineStateSelect"></select></div>' +
        '<div class="form-row"><label>Condado/Region</label><select class="form-select" name="countyName" id="fineCountySelect"></select></div>' +
        '<div class="form-row"><label>Pueblo/Asentamiento</label><select class="form-select" name="townName" id="fineTownSelect"></select></div>' +
        '<div class="form-row form-row--full"><label>Detalle del Lugar</label><input class="form-input" name="locationDetail" placeholder="Frente a la estacion, al norte del corral, etc."></div>' +
      "</div>" +
      '<div class="form-grid"><div class="form-row"><label>Descripcion</label><textarea class="form-textarea" name="description"></textarea></div></div>',
      function (data, close) {
        if (!safeText(data.charge, "") || Number(data.amount || 0) <= 0) {
          toast("Debe indicar cargo y monto valido.");
          return false;
        }
        if (!safeText(data.stateName, "") || !safeText(data.countyName, "") || !safeText(data.townName, "")) {
          toast("Debe seleccionar estado, condado y pueblo.");
          return false;
        }

        const selectedArticle = getPenalArticleByCode(data.articleCode || data.penalCode);
        nuiFetch("issueFine", {
          individualId: citizen.id,
          charge: data.charge,
          penalCode: data.penalCode,
          category: selectedArticle ? selectedArticle.category : "",
          amount: Number(data.amount || 0),
          description: data.description,
          stateName: data.stateName,
          countyName: data.countyName,
          townName: data.townName,
          locationDetail: data.locationDetail || ""
        }).then(function () {
          close();
          toast("Multa asentada en el registro.");
          openCitizenProfile(citizen.id);
        });
      },
      "Emitir Multa",
      citizen.firstname + " " + citizen.lastname
    );

    const categorySelect = document.getElementById("fineCategorySelect");
    const articleSelect = document.getElementById("fineArticleSelect");
    const chargeInput = document.querySelector('#modalRoot input[name="charge"]');
    const penalCodeInput = document.querySelector('#modalRoot input[name="penalCode"]');
    const amountInput = document.querySelector('#modalRoot input[name="amount"]');
    const descriptionInput = document.querySelector('#modalRoot textarea[name="description"]');

    function fillArticles(categoryKey) {
      const category = penalCatalog.find(function (entry) {
        return entry.key === categoryKey;
      });
      const options = ['<option value="">Seleccione un articulo</option>'];
      if (category) {
        category.charges.forEach(function (article) {
          options.push('<option value="' + escapeHtml(article.code) + '">' + escapeHtml(article.code + " - " + article.name) + "</option>");
        });
      }
      articleSelect.innerHTML = options.join("");
    }

    function applyArticle(code) {
      const article = getPenalArticleByCode(code);
      if (!article) {
        return;
      }
      chargeInput.value = safeText(article.name, "");
      penalCodeInput.value = safeText(article.code, "");
      amountInput.value = Number(article.fine || 0);
      descriptionInput.value = safeText(article.description, "");
    }

    if (categorySelect && articleSelect) {
      categorySelect.addEventListener("change", function () {
        fillArticles(categorySelect.value);
      });
      articleSelect.addEventListener("change", function () {
        applyArticle(articleSelect.value);
      });
    }

    bindFineJurisdictionSelectors();
  }

  function openWarrantModal(citizen) {
    const citizenId = citizen ? citizen.id : "";
    const citizenName = citizen ? citizen.firstname + " " + citizen.lastname : "";
    const penalCatalog = getPenalCatalog();
    const categoryOptions = ['<option value="">Seleccione una categoria</option>'].concat(penalCatalog.map(function (category) {
      return '<option value="' + escapeHtml(category.key) + '">' + escapeHtml(category.label) + "</option>";
    })).join("");
    showModal(
      "Crear Orden",
      '<div class="form-grid form-grid--two">' +
        '<div class="form-row"><label>ID del Ciudadano</label><input class="form-input" name="individualId" value="' + escapeHtml(citizenId) + '"></div>' +
        '<div class="form-row"><label>Nivel de Peligro</label><select class="form-select" name="dangerLevel"><option value="low">Bajo</option><option value="medium" selected>Medio</option><option value="high">Alto</option><option value="extreme">Extremo</option></select></div>' +
        '<div class="form-row"><label>Titulo</label><input class="form-input" name="title" value="' + escapeHtml(citizenName ? "Orden de Arresto: " + citizenName : "") + '"></div>' +
        '<div class="form-row"><label>Recompensa</label><input class="form-input" name="bounty" type="number" min="0"></div>' +
      "</div>" +
      '<div class="form-grid">' +
        '<div class="form-grid form-grid--two">' +
          '<div class="form-row"><label>Categoria Penal</label><select class="form-select" name="warrantCategoryKey" id="warrantCategorySelect">' + categoryOptions + '</select></div>' +
          '<div class="form-row"><label>Articulo</label><select class="form-select" name="warrantArticleCode" id="warrantArticleSelect"><option value="">Seleccione un articulo</option></select></div>' +
        '</div>' +
        '<div class="form-row"><label>Cargos</label><textarea class="form-textarea" name="charges"></textarea></div>' +
        '<div class="form-row"><label>Motivo</label><textarea class="form-textarea" name="reason"></textarea></div>' +
      "</div>",
      function (data, close) {
        if (!safeText(data.individualId, "") || !safeText(data.title, "")) {
          toast("Debe indicar el ciudadano y el titulo de la orden.");
          return false;
        }

        nuiFetch("createWarrant", {
          individualId: Number(data.individualId),
          title: data.title,
          charges: data.charges,
          reason: data.reason,
          dangerLevel: data.dangerLevel,
          bounty: Number(data.bounty || 0)
        }).then(function () {
          close();
          toast("Orden redactada para su firma.");
          loadWanted();
        });
      },
      "Crear Orden",
      citizenName || "Indique el ciudadano sobre el cual recaera la orden."
    );

    const warrantCategorySelect = document.getElementById("warrantCategorySelect");
    const warrantArticleSelect = document.getElementById("warrantArticleSelect");
    const chargesField = document.querySelector('#modalRoot textarea[name="charges"]');
    const reasonField = document.querySelector('#modalRoot textarea[name="reason"]');

    function fillWarrantArticles(categoryKey) {
      const category = penalCatalog.find(function (entry) {
        return entry.key === categoryKey;
      });
      const options = ['<option value="">Seleccione un articulo</option>'];
      if (category) {
        category.charges.forEach(function (article) {
          options.push('<option value="' + escapeHtml(article.code) + '">' + escapeHtml(article.code + " - " + article.name) + "</option>");
        });
      }
      warrantArticleSelect.innerHTML = options.join("");
    }

    function appendSelectedWarrantArticle() {
      const article = getPenalArticleByCode(warrantArticleSelect.value);
      if (!article) {
        return;
      }

      const entry = article.code + " - " + article.name;
      const existing = safeText(chargesField.value, "");
      chargesField.value = existing ? existing + "\n" + entry : entry;
      if (!safeText(reasonField.value, "") && safeText(article.description, "")) {
        reasonField.value = article.description;
      }
    }

    if (warrantCategorySelect && warrantArticleSelect) {
      warrantCategorySelect.addEventListener("change", function () {
        fillWarrantArticles(warrantCategorySelect.value);
      });
      warrantArticleSelect.addEventListener("change", appendSelectedWarrantArticle);
    }
  }

  function openCaseModal(caseType, citizen) {
    const selectedCaseType = caseType || "case_file";
    showModal(
      "Nuevo Reporte",
      '<div class="form-grid form-grid--two">' +
        '<div class="form-row"><label>Titulo</label><input class="form-input" name="title" value="' + escapeHtml(citizen ? caseTypeLabel(selectedCaseType) + ": " + citizen.firstname + " " + citizen.lastname : "") + '"></div>' +
        '<div class="form-row"><label>Tipo</label><select class="form-select" name="caseType">' + caseTypeOptions() + "</select></div>" +
        '<div class="form-row"><label>Estado</label><select class="form-select" name="state">' + caseStateOptions() + "</select></div>" +
        '<div class="form-row"><label>ID del Ciudadano</label><input class="form-input" name="citizenId" value="' + escapeHtml(citizen ? citizen.id : "") + '"></div>' +
      "</div>" +
      '<div class="form-grid">' +
        '<div class="form-row"><label>Resumen</label><textarea class="form-textarea" name="summary"></textarea></div>' +
        '<div class="form-row"><label>Contenido Completo</label><textarea class="form-textarea" name="content"></textarea></div>' +
      "</div>",
      function (data, close) {
        if (!safeText(data.title, "")) {
          toast("Debe indicar un titulo para el reporte.");
          return false;
        }

        nuiFetch("createCase", {
          title: data.title,
          caseType: data.caseType || selectedCaseType,
          state: data.state || "open",
          summary: data.summary,
          content: data.content,
          citizenId: data.citizenId ? Number(data.citizenId) : null,
          citizenName: citizen ? citizen.firstname + " " + citizen.lastname : "",
          incidents: [],
          charges: []
        }).then(function () {
          close();
          toast("Reporte archivado.");
          loadCases(1);
          showPanel("filing", "filing");
        });
      },
      "Archivar Reporte"
    );

    setTimeout(function () {
      const select = document.querySelector('#modalRoot select[name="caseType"]');
      if (select) {
        select.value = selectedCaseType;
      }
    }, 0);
  }

  function openGangModal() {
    showModal(
      "Nuevo Expediente de Banda",
      '<div class="form-grid form-grid--two">' +
        '<div class="form-row"><label>Nombre</label><input class="form-input" name="name"></div>' +
        '<div class="form-row"><label>Alias</label><input class="form-input" name="alias"></div>' +
        '<div class="form-row"><label>Territorio</label><input class="form-input" name="territory"></div>' +
        '<div class="form-row"><label>Nivel de Amenaza</label><select class="form-select" name="threatLevel"><option value="low">Bajo</option><option value="medium">Medio</option><option value="high">Alto</option><option value="extreme">Extremo</option></select></div>' +
      "</div>" +
      '<div class="form-grid"><div class="form-row"><label>Descripcion</label><textarea class="form-textarea" name="description"></textarea></div></div>',
      function (data, close) {
        if (!safeText(data.name, "")) {
          toast("Debe indicar el nombre de la banda.");
          return false;
        }

        nuiFetch("createGang", {
          name: data.name,
          alias: data.alias,
          territory: data.territory,
          threatLevel: data.threatLevel,
          description: data.description
        }).then(function () {
          close();
          toast("Expediente de banda abierto.");
          loadGangs();
        });
      },
      "Abrir Expediente"
    );
  }

  function openTelegramModal() {
    nuiFetch("getOfficersList", {}).then(function (officers) {
      const options = ['<option value="">Seleccione un oficial</option>'].concat((officers || []).map(function (officer) {
        return '<option value="' + escapeHtml(officer.identifier) + '">' + escapeHtml(officer.name + " - " + officer.rank) + "</option>";
      })).join("");

      showModal(
        "Redactar Telegrama",
        '<div class="form-grid form-grid--two">' +
          '<div class="form-row"><label>Oficial</label><select class="form-select" name="toIdentifier">' + options + "</select></div>" +
          '<div class="form-row"><label>Nombre del Destinatario</label><input class="form-input" name="toName"></div>' +
          '<div class="form-row"><label>Asunto</label><input class="form-input" name="subject"></div>' +
          '<div class="form-row"><label>Urgente</label><select class="form-select" name="urgent"><option value="0">No</option><option value="1">Si</option></select></div>' +
        "</div>" +
        '<div class="form-grid"><div class="form-row"><label>Mensaje</label><textarea class="form-textarea" name="body"></textarea></div></div>',
        function (data, close) {
          if (!safeText(data.toIdentifier, "") || !safeText(data.subject, "") || !safeText(data.body, "")) {
            toast("Debe indicar destinatario, asunto y cuerpo.");
            return false;
          }

          nuiFetch("sendTelegram", {
            toIdentifier: data.toIdentifier,
            toName: data.toName,
            subject: data.subject,
            body: data.body,
            urgent: data.urgent === "1"
          }).then(function () {
            close();
            toast("Telegrama enviado.");
            loadTelegrams("outbox");
          });
        },
        "Enviar Telegrama"
      );

      const select = document.querySelector('#modalRoot select[name="toIdentifier"]');
      const nameInput = document.querySelector('#modalRoot input[name="toName"]');
      if (select && nameInput) {
        select.addEventListener("change", function () {
          const chosen = (officers || []).find(function (officer) {
            return officer.identifier === select.value;
          });
          if (chosen) {
            nameInput.value = chosen.name;
          }
        });
      }
    });
  }

  function archiveCurrentCitizen() {
    if (!state.currentCitizen) {
      return;
    }

    showModal(
      "Archivar Ficha Ciudadana",
      '<div class="soft-text">Esto archivara la ficha ciudadana y cancelara las ordenes activas ligadas a ella.</div>',
      function (_, close) {
        nuiFetch("archiveIndividual", { id: state.currentCitizen.id }).then(function () {
          close();
          state.currentCitizen = null;
          toast("Ficha ciudadana archivada.");
          showPanel("citizens", "citizens");
          loadCitizens();
        });
      },
      "Archivar"
    );
  }

  function archiveCurrentCase() {
    if (!state.currentCase) {
      return;
    }

    showModal(
      "Archivar Expediente",
      '<div class="soft-text">El reporte escogido pasara al estado archivado.</div>',
      function (_, close) {
        nuiFetch("archiveCase", { id: state.currentCase.id }).then(function () {
          close();
          toast("Expediente archivado.");
          showPanel("filing", "filing");
          loadCases(state.casePage);
        });
      },
      "Archivar"
    );
  }

  function applyOpenPayload(payload) {
    state.open = true;
    state.demo = false;
    state.player = payload.player || state.player;
    state.serverName = payload.serverName || state.serverName;
    state.departmentSeal = payload.departmentSeal || state.departmentSeal;
    state.caseTypes = payload.caseTypes || state.caseTypes;
    state.caseStates = payload.caseStates || state.caseStates;
    state.penalCode = payload.penalCode || state.penalCode;
    state.penalCodeSource = payload.penalCodeSource || state.penalCodeSource;
    state.penalCodeFallback = payload.penalCodeFallback === true;
    state.fineJurisdictions = payload.fineJurisdictions || state.fineJurisdictions;

    document.body.style.display = "flex";
    setHeader();
    refreshCaseFilterOptions();
    showPanel("citizens", "citizens");
    if (state.penalCodeFallback) {
      toast("Codigo Penal de contingencia cargado. LegalDocs no respondio.");
    }
    loadCitizens();
  }

  function bindEvents() {
    document.querySelectorAll(".side-tab").forEach(function (button) {
      button.addEventListener("click", function () {
        const panel = button.dataset.panel;
        showPanel(panel, panel);

        if (panel === "citizens") {
          loadCitizens();
        } else if (panel === "filing") {
          loadCases(1);
        } else if (panel === "wanted") {
          loadWanted();
        } else if (panel === "gangs") {
          loadGangs();
        } else if (panel === "dashboard") {
          loadDashboard();
        } else if (panel === "telegram") {
          loadTelegrams("inbox");
        }
      });
    });

    byId("closeMdtBtn").addEventListener("click", closeMDT);
    byId("citizensAddBtn").addEventListener("click", function () { openCitizenModal(); });
    byId("citizensRefreshBtn").addEventListener("click", loadCitizens);
    byId("citizensBackBtn").addEventListener("click", closeMDT);
    byId("citizenSearch").addEventListener("input", loadCitizens);
    byId("citizenStatusFilter").addEventListener("change", loadCitizens);

    byId("profileArchiveBtn").addEventListener("click", archiveCurrentCitizen);
    byId("profileEditBtn").addEventListener("click", function () {
      if (state.currentCitizen) {
        openCitizenModal(state.currentCitizen, state.currentCitizen.id);
      }
    });
    byId("profileRefreshBtn").addEventListener("click", function () {
      if (state.currentCitizen) {
        openCitizenProfile(state.currentCitizen.id);
      }
    });
    byId("profileBackBtn").addEventListener("click", function () {
      showPanel("citizens", "citizens");
      loadCitizens();
    });

    byId("filingNewBtn").addEventListener("click", function () { openCaseModal("case_file"); });
    byId("filingRefreshBtn").addEventListener("click", function () { loadCases(state.casePage || 1); });
    byId("caseSearch").addEventListener("input", function () { loadCases(1); });
    byId("caseTypeFilter").addEventListener("change", function () { loadCases(1); });
    byId("caseStateFilter").addEventListener("change", function () { loadCases(1); });
    byId("casePrevBtn").addEventListener("click", function () { loadCases(Math.max(1, state.casePage - 1)); });
    byId("caseNextBtn").addEventListener("click", function () { loadCases(state.casePage + 1); });
    byId("caseArchiveBtn").addEventListener("click", archiveCurrentCase);
    byId("caseBackBtn").addEventListener("click", function () {
      showPanel("filing", "filing");
      loadCases(state.casePage || 1);
    });

    byId("wantedNewBtn").addEventListener("click", function () { openWarrantModal(); });
    byId("wantedRefreshBtn").addEventListener("click", loadWanted);

    byId("gangsNewBtn").addEventListener("click", openGangModal);
    byId("gangsRefreshBtn").addEventListener("click", loadGangs);

    byId("dashboardRefreshBtn").addEventListener("click", loadDashboard);

    byId("telegramComposeBtn").addEventListener("click", openTelegramModal);
    byId("telegramInboxBtn").addEventListener("click", function () { loadTelegrams("inbox"); });
    byId("telegramOutboxBtn").addEventListener("click", function () { loadTelegrams("outbox"); });
    byId("telegramRefreshBtn").addEventListener("click", function () { loadTelegrams(state.telegramMode || "inbox"); });

    window.addEventListener("message", function (event) {
      const payload = event.data || {};
      if (payload.type === "open") {
        applyOpenPayload(payload.data || {});
      } else if (payload.type === "hide") {
        state.open = false;
        if (!state.demo) {
          document.body.style.display = "none";
        }
      } else if (payload.type === "fineNotification") {
        showFineNotice(payload.data || {});
      } else if (payload.type === "fineIssued") {
        toast("Multa emitida.");
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeMDT();
      }
    });
  }

  function initializeDemo() {
    state.fineJurisdictions = demo.fineJurisdictions || state.fineJurisdictions;
    document.body.style.display = "flex";
    setHeader();
    refreshCaseFilterOptions();
    showPanel("citizens", "citizens");
    loadCitizens();
    if (state.penalCodeFallback) {
      toast("Codigo Penal de contingencia cargado. LegalDocs no respondio.");
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindEvents();
    refreshCaseFilterOptions();
    setHeader();

    if (state.demo) {
      initializeDemo();
    }
  });
})();

