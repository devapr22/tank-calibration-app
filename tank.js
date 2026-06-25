const selectedCompanyId = localStorage.getItem("selectedCompany");
const tankMode = localStorage.getItem("tankMode");

let companies = [];
let company = null;
let editingTankId = null;
let strappingAction = 'add';

async function loadCompanies() {
    const response = await fetch("http://localhost:3000/companies");
    companies = await response.json();
    // DB uses 'name' but tank.js uses 'companyName' — map it
    companies = companies.map(c => ({ ...c, companyName: c.name, tanks: [] }));
    company = companies.find(c => String(c.id) === String(selectedCompanyId)) || null;
    // Load tanks for the selected company if there is one
    if (company) {
        const tanksRes = await fetch(`http://localhost:3000/tanks/${company.id}`);
        company.tanks = await tanksRes.json();
    }
    initMode();
}

loadCompanies();

// Initialize UI based on mode
function initMode() {
    const titleEl = document.getElementById("companyTitle");
    const descEl = document.getElementById("modeDescription");

    if (tankMode === "edit") {
        if (!company) {
            alert("No company selected or company not found.");
            window.location.href = "index.html";
            return;
        }
        titleEl.innerText = `Tank Details for ${company.companyName}`;
        descEl.innerText = "Select a tank below to edit its courses and readings.";
        document.getElementById("editModeSection").style.display = "block";
        renderExistingTankList();
    } else if (tankMode === 'strapping') {
        titleEl.innerText = 'Strapping - Create Tank';
        descEl.innerText = 'Select company, add a new tank or edit an existing one.';
        document.getElementById('addModeSection').style.display = 'block';
        // show company select for strapping
        const label = document.getElementById('companySelectLabel');
        const sel = document.getElementById('companySelectForStrapping');
        const actionSection = document.getElementById('strappingActionSection');
        if (label) label.style.display = 'inline-block';
        if (sel) sel.style.display = 'inline-block';
        if (actionSection) actionSection.style.display = 'block';
        setStrappingAction('add');
    } else if (tankMode === 'deadwood') {
        titleEl.innerText = 'Deadwood Editor';
        descEl.innerText = 'Select company and tank to edit deadwoods.';
        // show controls for company and tank
        const label = document.getElementById('companySelectLabel');
        const sel = document.getElementById('companySelectForStrapping');
        const tankLabel = document.getElementById('tankSelectLabel');
        const tankSel = document.getElementById('tankSelectForDeadwood');
        const saveBtn = document.getElementById('saveDeadwoodButton');
        if (label) label.style.display = 'inline-block';
        if (sel) sel.style.display = 'inline-block';
        if (tankLabel) tankLabel.style.display = 'inline-block';
        if (tankSel) tankSel.style.display = 'inline-block';
        if (saveBtn) {
            saveBtn.style.display = 'inline-block';
            saveBtn.onclick = saveDeadwoodForSelectedTank;
        }
    } else {
        titleEl.innerText = 'Tank Details';
        descEl.innerText = 'Enter the tank details and number of courses to calculate volume.';
        document.getElementById('addModeSection').style.display = 'block';
    }

    populateDropdowns();
    populateCompanySelects();
}





function populateDropdowns() {
    const courseSelect = document.getElementById("courseCount");
    const readingsSelect = document.getElementById("readingsPerCourse");

    if (courseSelect) {
        courseSelect.innerHTML = "";
        for (let i = 1; i <= 15; i++) {
            const option = document.createElement("option");
            option.value = i;
            option.innerText = i;
            courseSelect.appendChild(option);
        }
        courseSelect.value = "1";
    }

    if (readingsSelect) {
        readingsSelect.innerHTML = "";
        for (let i = 1; i <= 3; i++) {
            const option = document.createElement("option");
            option.value = i;
            option.innerText = i;
            readingsSelect.appendChild(option);
        }
        readingsSelect.value = "3";
    }
}

function populateCompanySelects() {
    const sel = document.getElementById('companySelectForStrapping');
    const tankSel = document.getElementById('tankSelectForDeadwood');
    if (sel) {
        sel.innerHTML = '';
        companies.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.innerText = c.companyName;
            sel.appendChild(opt);
        });
        if (companies.length) sel.value = companies[0].id;
        sel.onchange = () => {
            if (tankMode === 'deadwood') populateTankSelectForDeadwood(sel.value);
            if (tankMode === 'strapping') populateStrappingTankSelect(sel.value);
        };
    }
    if (tankSel) {
        tankSel.innerHTML = '';
    }
    // If a selectedCompany was set earlier, pre-select it
    if (company && sel) sel.value = company.id;
    if (tankMode === 'deadwood' && sel) populateTankSelectForDeadwood(sel.value);
    if (tankMode === 'strapping' && sel) populateStrappingTankSelect(sel.value);
}

function setStrappingAction(action) {
    strappingAction = action;
    const tankSelect = document.getElementById('strappingTankSelect');
    const tankSelectLabel = document.getElementById('strappingTankLabel');
    const saveBtn = document.getElementById('saveTankButton');
    const courseLabel = document.getElementById('courseCountLabel');
    const courseSelect = document.getElementById('courseCount');
    const readingsLabel = document.getElementById('readingsPerCourseLabel');
    const readingsSelect = document.getElementById('readingsPerCourse');
    const info = document.getElementById('strappingFormInfo');
    const header = document.getElementById('strappingHeader');
    const tankNumberLabel = document.getElementById('tankNumberLabel');
    const tankNumberInput = document.getElementById('tankNumber');
    const prepareBtn = document.querySelector('button[onclick="prepareStrapping()"]');

    if (action === 'edit') {
        const addBtn = document.getElementById('addTankModeBtn');
        const editBtn = document.getElementById('editTankModeBtn');
        if (addBtn) addBtn.classList.remove('active');
        if (editBtn) editBtn.classList.add('active');
        if (tankSelect) tankSelect.style.display = 'inline-block';
        if (tankSelectLabel) tankSelectLabel.style.display = 'block';
        if (tankNumberLabel) tankNumberLabel.style.display = 'none';
        if (tankNumberInput) tankNumberInput.style.display = 'none';
        if (prepareBtn) prepareBtn.style.display = 'none';
        if (saveBtn) saveBtn.innerText = 'Update Tank';
        if (courseLabel) courseLabel.style.display = 'none';
        if (courseSelect) courseSelect.style.display = 'none';
        if (readingsLabel) readingsLabel.style.display = 'none';
        if (readingsSelect) readingsSelect.style.display = 'none';
        if (info) info.style.display = 'block';
        if (header) header.innerText = 'Edit Existing Tank';
        const compSel = document.getElementById('companySelectForStrapping');
        if (compSel) populateStrappingTankSelect(compSel.value);
        updateStrappingInfo();
    } else {
        const addBtn = document.getElementById('addTankModeBtn');
        const editBtn = document.getElementById('editTankModeBtn');
        if (addBtn) addBtn.classList.add('active');
        if (editBtn) editBtn.classList.remove('active');
        if (tankSelect) tankSelect.style.display = 'none';
        if (tankSelectLabel) tankSelectLabel.style.display = 'none';
        if (tankNumberLabel) tankNumberLabel.style.display = 'block';
        if (tankNumberInput) tankNumberInput.style.display = 'inline-block';
        if (prepareBtn) prepareBtn.style.display = 'inline-block';
        if (saveBtn) saveBtn.innerText = 'Save Tank';
        if (courseLabel) courseLabel.style.display = 'block';
        if (courseSelect) courseSelect.style.display = 'inline-block';
        if (readingsLabel) readingsLabel.style.display = 'block';
        if (readingsSelect) readingsSelect.style.display = 'inline-block';
        if (info) {
            info.style.display = 'none';
            info.innerHTML = '';
        }
        if (header) header.innerText = 'Add New Tank';
        clearStrappingForm();
    }
}

async function populateStrappingTankSelect(companyId) {
    const tankSelect = document.getElementById('strappingTankSelect');
    if (!tankSelect) return;
    tankSelect.innerHTML = '';
    const res = await fetch(`http://localhost:3000/tanks/${companyId}`);
    const tanks = await res.json();
    // also update this company's tanks in memory
    const comp = companies.find(c => String(c.id) === String(companyId));
    if (comp) comp.tanks = tanks;

    if (!tanks.length) {
        tankSelect.style.display = 'none';
        if (strappingAction === 'edit') showMessage('No tanks available for this company.', true);
        return;
    }
    tanks.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.innerText = t.tank_number;
        tankSelect.appendChild(opt);
    });
    tankSelect.onchange = async () => {
        const tankId = tankSelect.value;
        // Fetch strapping and deadwood from DB
        const [strappingRes, deadwoodRes] = await Promise.all([
            fetch(`http://localhost:3000/strapping/${tankId}`),
            fetch(`http://localhost:3000/deadwood/${tankId}`)
        ]);
        const strappingRows = await strappingRes.json();
        const deadwood = await deadwoodRes.json();
        const tank = tanks.find(t => String(t.id) === String(tankId));
        // Convert DB rows back to the format renderStrappingTable expects
        const courses = [];
        strappingRows.forEach(row => {
            let course = courses.find(c => c.courseNumber === row.course_number);
            if (!course) { course = { courseNumber: row.course_number, rows: [] }; courses.push(course); }
            course.rows.push({
                position: row.position,
                externalCircumference: row.external_circumference,
                stepover: row.stepover,
                plateThickness: row.plate_thickness,
                tempTape: row.temp_tape,
                correctionThickness: row.correction_thickness,
                internalCircumference: row.internal_circumference
            });
        });
        // Convert deadwood DB rows
        const deadwoodFormatted = {
            horizontal: deadwood.horizontal.map(r => ({ heightStart: r.height_start, heightEnd: r.height_end, length: r.length, name: r.name, volume: r.volume, litrePerCm: r.litre_per_cm })),
            vertical: deadwood.vertical.map(r => ({ method: r.method, area: r.area, heightStart: r.height_start, length: r.length, name: r.name, volume: r.volume, litrePerCm: r.litre_per_cm }))
        };
        loadTankIntoStrappingForm({ ...tank, tankNumber: tank.tank_number, courseCount: tank.course_count, readingsPerCourse: tank.readings_per_course, courses, deadwood: deadwoodFormatted });
        updateStrappingInfo();
    };
    if (strappingAction === 'edit') {
        tankSelect.style.display = 'inline-block';
        if (tankSelect.options.length) {
            tankSelect.value = tankSelect.options[0].value;
            tankSelect.onchange();
        }
    }
}
function updateStrappingInfo() {
    const info = document.getElementById('strappingFormInfo');
    if (!info) return;
    const courseCount = document.getElementById('courseCount').value;
    const readingsPerCourse = document.getElementById('readingsPerCourse').value;
    const tankSelect = document.getElementById('strappingTankSelect');
    const selectedTankText = tankSelect && tankSelect.selectedOptions.length
        ? tankSelect.selectedOptions[0].text
        : '';
    info.innerHTML = `Tank Number: <strong>${selectedTankText || 'None'}</strong> &nbsp;|&nbsp; Courses: ${courseCount} &nbsp;|&nbsp; Readings per course: ${readingsPerCourse}`;
}

function clearStrappingForm() {
    const numberInput = document.getElementById('tankNumber');
    const courseSelect = document.getElementById('courseCount');
    const readingsSelect = document.getElementById('readingsPerCourse');
    const courseInputs = document.getElementById('courseInputs');
    if (numberInput) numberInput.value = '';
    if (courseSelect) courseSelect.value = '1';
    if (readingsSelect) readingsSelect.value = '3';
    if (courseInputs) courseInputs.innerHTML = '';
    const dead = document.getElementById('deadwoodSection');
    if (dead) {
        dead.innerHTML = '';
        dead.style.display = 'none';
    }
    const deadBtn = document.getElementById('toggleDeadwoodBtn');
    if (deadBtn) deadBtn.innerText = 'Show Deadwood';
    editingTankId = null;
}




function loadTankIntoStrappingForm(tank) {
    if (!tank) return;
    const numberInput = document.getElementById('tankNumber');
    const tankNumberLabel = document.getElementById('tankNumberLabel');
    const courseSelect = document.getElementById('courseCount');
    const readingsSelect = document.getElementById('readingsPerCourse');
    // Keep tank number input hidden in edit mode — shown only in strappingFormInfo
    if (numberInput) {
        numberInput.value = tank.tankNumber || '';
        numberInput.style.display = 'none';
    }
    if (tankNumberLabel) tankNumberLabel.style.display = 'none';
    if (courseSelect) courseSelect.value = String(tank.courseCount || '1');
    if (readingsSelect) readingsSelect.value = String(tank.readingsPerCourse || '3');
    renderStrappingTable(tank.courseCount, tank.readingsPerCourse, 'courseInputs', tank.courses);
    // Always render deadwood so edits are preserved on save
    const dead = document.getElementById('deadwoodSection');
    const deadBtn = document.getElementById('toggleDeadwoodBtn');
    if (dead) {
        renderDeadwoodSection('deadwoodSection', {
            horizontal: tank.deadwood?.horizontal || [],
            vertical: tank.deadwood?.vertical || []
        });
        const hasDeadwood = (tank.deadwood?.horizontal?.length || 0) + (tank.deadwood?.vertical?.length || 0) > 0;
        dead.style.display = hasDeadwood ? 'block' : 'none';
        if (deadBtn) deadBtn.innerText = hasDeadwood ? 'Hide Deadwood' : 'Show Deadwood';
    }
    editingTankId = tank.id;
    updateStrappingInfo();
    // Show course/readings selects so user can change them
    const courseLabel = document.getElementById('courseCountLabel');
    const courseSelect2 = document.getElementById('courseCount');
    const readingsLabel = document.getElementById('readingsPerCourseLabel');
    const readingsSelect2 = document.getElementById('readingsPerCourse');
    if (courseLabel) courseLabel.style.display = 'block';
    if (courseSelect2) courseSelect2.style.display = 'inline-block';
    if (readingsLabel) readingsLabel.style.display = 'block';
    if (readingsSelect2) readingsSelect2.style.display = 'inline-block';
    // Show the Update Tank button
    const saveBtn = document.getElementById('saveTankButton');
    if (saveBtn) {
        saveBtn.innerText = 'Update Tank';
        saveBtn.style.display = 'inline-block';
    }
}

async function populateTankSelectForDeadwood(companyId) {
    const tankSel = document.getElementById('tankSelectForDeadwood');
    if (!tankSel) return;
    tankSel.innerHTML = '';

    const res = await fetch(`http://localhost:3000/tanks/${companyId}`);
    const tanks = await res.json();

    if (!tanks.length) {
        tankSel.innerHTML = '<option>No tanks found</option>';
        return;
    }

    tanks.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.innerText = t.tank_number;
        tankSel.appendChild(opt);
    });

    tankSel.onchange = async () => {
        const tankId = tankSel.value;
        const deadwoodRes = await fetch(`http://localhost:3000/deadwood/${tankId}`);
        const deadwood = await deadwoodRes.json();

        const deadwoodFormatted = {
            horizontal: deadwood.horizontal.map(r => ({
                heightStart: r.height_start,
                heightEnd: r.height_end,
                length: r.length,
                name: r.name,
                volume: r.volume,
                litrePerCm: r.litre_per_cm
            })),
            vertical: deadwood.vertical.map(r => ({
                method: r.method,
                area: r.area,
                heightStart: r.height_start,
                length: r.length,
                name: r.name,
                volume: r.volume,
                litrePerCm: r.litre_per_cm
            }))
        };

        renderDeadwoodSection('deadwoodModeSection', deadwoodFormatted);
        const cont = document.getElementById('deadwoodModeSection');
        if (cont) cont.style.display = 'block';
    };

    // Auto-load first tank
    if (tankSel.options.length) {
        tankSel.value = tankSel.options[0].value;
        tankSel.onchange();
    }
}

function prepareStrapping() {
    const courseCount = parseInt(document.getElementById("courseCount").value, 10);
    const readingsPerCourse = parseInt(document.getElementById("readingsPerCourse").value, 10);
    const tankNumber = document.getElementById("tankNumber").value.trim();

    if (!tankNumber) {
        showMessage("Tank number is required.", true);
        return;
    }

    if (!courseCount || courseCount < 1) {
        showMessage("Enter a valid number of courses.", true);
        return;
    }

    if (!readingsPerCourse || readingsPerCourse < 1) {
        showMessage("Select readings per course.", true);
        return;
    }

    showMessage("");
    renderStrappingTable(courseCount, readingsPerCourse, "courseInputs");
    document.getElementById("saveTankButton").style.display = "inline-block";
}

function renderStrappingTable(courseCount, readingsPerCourse, containerId, existingCourses = null) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";

    const tableRows = [];

    for (let course = 1; course <= courseCount; course++) {
        const existingCourse = existingCourses?.find(c => c.courseNumber === course);

        // Generate only the required rows based on readingsPerCourse
        const positionMap = {
            1: ["Top"],
            2: ["Top", "Bottom"],
            3: ["Top", "Middle", "Bottom"]
        };
        const positions = positionMap[readingsPerCourse] || ["Top", "Middle", "Bottom"];

        for (let row = 0; row < positions.length; row++) {
            const position = positions[row];
            const existingRow = existingCourse ? existingCourse.rows[row] : null;

            tableRows.push(`
                <tr class="strapping-row" data-course="${course}" data-position="${position}">
                    ${row === 0 ? `
                        <td class="course-number" rowspan="${positions.length}">
                            Course ${course}
                        </td>
                    ` : ""}
                    ${readingsPerCourse > 1 ? `<td>${position}</td>` : ""}
                    <td><input type="number" step="any" class="external-circumference" value="${existingRow?.externalCircumference || ""}"></td>
                    <td><input type="number" step="any" class="stepover" value="${existingRow?.stepover || ""}"></td>
                    <td><input type="number" step="any" class="plate-thickness" value="${existingRow?.plateThickness || ""}"></td>
                    <td><input type="number" step="any" class="temp-tape" value="${existingRow?.tempTape || ""}" readonly></td>
                    <td><input type="number" step="any" class="correction-thickness" value="${existingRow?.correctionThickness || ""}" readonly></td>
                    <td><input type="number" step="any" class="internal-circumference" value="${existingRow?.internalCircumference || ""}" readonly></td>
                </tr>
            `);
        }
    }

    const positionHeaderCol = readingsPerCourse > 1 ? `<th>Position</th>` : "";

    container.innerHTML = `
        <h3>Strapping</h3>
        <table class="strapping-table">
            <thead>
                <tr>
                    <th>Course No</th>
                    ${positionHeaderCol}
                    <th>External Circumference (m)</th>
                    <th>Stepover (m)</th>
                    <th>Plate Thickness (mm)</th>
                    <th>Temp Tape (m)</th>
                    <th>Correction Thickness (m)</th>
                    <th>Internal Circumference (m)</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows.join("")}
            </tbody>
        </table>
    `;

    attachStrappingListeners(containerId);
    updateGeneratedValues(containerId);
}


function attachStrappingListeners(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const editableClasses = ['external-circumference', 'stepover', 'plate-thickness'];

    const allRows = Array.from(container.querySelectorAll('.strapping-row'));

    allRows.forEach((row, rowIndex) => {
        const editableInputs = editableClasses
            .map(cls => row.querySelector(`input.${cls}`))
            .filter(Boolean);

        editableInputs.forEach((input, colIndex) => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const isLastCol = colIndex === editableInputs.length - 1;
                    if (isLastCol) {
                        // Move to first editable input of next row
                        const nextRow = allRows[rowIndex + 1];
                        if (nextRow) {
                            const nextFirst = nextRow.querySelector(`input.${editableClasses[0]}`);
                            if (nextFirst) { nextFirst.focus(); nextFirst.select(); }
                        }
                    } else {
                        editableInputs[colIndex + 1].focus();
                        editableInputs[colIndex + 1].select();
                    }
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    if (colIndex < editableInputs.length - 1) {
                        editableInputs[colIndex + 1].focus();
                        editableInputs[colIndex + 1].select();
                    }
                } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    if (colIndex > 0) {
                        editableInputs[colIndex - 1].focus();
                        editableInputs[colIndex - 1].select();
                    }
                }
            });

            input.addEventListener('input', () => updateGeneratedValues(containerId));
        });
    });
}

function updateGeneratedValues(containerId) {
    const container = document.getElementById(containerId);
    const rows = container.querySelectorAll(".strapping-row");

    rows.forEach(row => {
        const externalInput = row.querySelector(".external-circumference");
        const stepoverInput = row.querySelector(".stepover");
        const plateInput = row.querySelector(".plate-thickness");
        const tempTapeInput = row.querySelector(".temp-tape");
        const correctionInput = row.querySelector(".correction-thickness");
        const internalInput = row.querySelector(".internal-circumference");

        const externalCircumference = parseFloat(externalInput.value) || 0;
        const stepover = parseFloat(stepoverInput.value) || 0;
        const plateThickness = parseFloat(plateInput.value) || 0;

        const tempTape = externalCircumference * 0.00009;
        const correctionThickness = (plateThickness * 6.2832) / 1000;
        const internalCircumference = externalCircumference - (stepover + tempTape + correctionThickness);

        tempTapeInput.value = tempTape.toFixed(6);
        correctionInput.value = correctionThickness.toFixed(6);
        internalInput.value = internalCircumference.toFixed(4);
    });
}

// --- Deadwood support: render tables, add/remove rows, and collect data ---
function toggleDeadwood() {
    const section = document.getElementById("deadwoodSection");
    const btn = document.getElementById("toggleDeadwoodBtn");
    if (section.style.display === "none") {
        renderDeadwoodSection("deadwoodSection");
        section.style.display = "block";
        btn.innerText = "Hide Deadwood";
    } else {
        section.style.display = "none";
        btn.innerText = "Show Deadwood";
    }
}

function toggleEditDeadwood() {
    const section = document.getElementById("editDeadwoodSection");
    const btn = document.getElementById("toggleEditDeadwoodBtn");
    if (section.style.display === "none") {
        renderDeadwoodSection("editDeadwoodSection");
        section.style.display = "block";
        btn.innerText = "Hide Deadwood";
    } else {
        section.style.display = "none";
        btn.innerText = "Show Deadwood";
    }
}

function renderDeadwoodSection(containerId, existing = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const horizontalRows = (existing && existing.horizontal) || [];
    const verticalRows = (existing && existing.vertical) || [];

    container.innerHTML = `
        <h3>Deadwood - Horizontal</h3>
        <button onclick="addHorizontalRow('${containerId}')">Add Horizontal Row</button>
        <table class="deadwood-table" id="${containerId}-horizontal">
            <thead>
                <tr>
                    <th>Height start from (cm)</th>
                    <th>Height end at (cm)</th>
                    <th>Length (cm)</th>
                    <th>Deadwood name</th>
                    <th>Volume litres</th>
                    <th>Litre per cm</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                ${horizontalRows.map(row => horizontalRowHtml(containerId, row)).join('')}
            </tbody>
        </table>

        <h3 style="margin-top:16px;">Deadwood - Vertical</h3>
        <button onclick="addVerticalRow('${containerId}')">Add Vertical Row</button>
        <table class="deadwood-table" id="${containerId}-vertical">
            <thead>
                <tr>
                    <th>Method</th>
                    <th>Cross sectional area (cm)</th>
                    <th>Height start from (cm)</th>
                    <th>Length (cm)</th>
                    <th>Deadwood name</th>
                    <th>Volume litres</th>
                    <th>Litre per cm</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                ${verticalRows.map(row => verticalRowHtml(containerId, row)).join('')}
            </tbody>
        </table>
    `;

    // Attach calculation listeners for horizontal deadwood
    // Attach calculation listeners for horizontal deadwood
    const hRows = container.querySelectorAll(`#${containerId}-horizontal tbody tr`);
    hRows.forEach(tr => attachHorizontalRowListeners(tr));

    // Attach calculation listeners for vertical deadwood
    const vRows = container.querySelectorAll(`#${containerId}-vertical tbody tr`);
    vRows.forEach(tr => attachVerticalRowListeners(tr));

    // Trigger initial calculations for existing rows
    hRows.forEach(tr => calculateHorizontalDeadwood(tr));
    vRows.forEach(tr => calculateVerticalDeadwood(tr));
}

function horizontalRowHtml(containerId, row = {}) {
    const h1 = row.heightStart ?? '';
    const h2 = row.heightEnd ?? '';
    const length = row.length ?? '';
    const name = row.name ?? '';
    const volume = row.volume ?? '';
    const lper = row.litrePerCm ?? '';

    return `
        <tr>
            <td><input type="number" step="any" class="hw-height-start" value="${h1}"></td>
            <td><input type="number" step="any" class="hw-height-end" value="${h2}"></td>
            <td><input type="number" step="any" class="hw-length" value="${length}"></td>
            <td><input type="text" class="hw-name" value="${name}"></td>
            <td><input type="number" step="any" class="hw-volume" value="${volume}" readonly></td>
            <td><input type="number" step="any" class="hw-lpc" value="${lper}" readonly></td>
            <td><button onclick="removeRow(this)">Delete</button></td>
        </tr>
    `;
}

function verticalRowHtml(containerId, row = {}) {
    const method = row.method ?? 'automatic';
    const area = row.area ?? '';
    const hstart = row.heightStart ?? '';
    const length = row.length ?? '';
    const name = row.name ?? '';
    const volume = row.volume ?? '';
    const lper = row.litrePerCm ?? '';

    const isManual = method === 'manual';
    const areaDisabled = isManual ? 'disabled style="background:#f0f0f0; color:#999;"' : '';
    const volumeReadonly = isManual ? '' : 'readonly';
    const volumeBg = isManual ? '' : 'style="background:#f0f0f0;"';

    return `
        <tr>
            <td>
                <select class="vw-method" onchange="onVerticalMethodChange(this)">
                    <option value="automatic" ${method === 'automatic' ? 'selected' : ''}>Automatic</option>
                    <option value="manual" ${method === 'manual' ? 'selected' : ''}>Manual</option>
                </select>
            </td>
            <td><input type="number" step="any" class="vw-area" value="${area}" ${areaDisabled}></td>
            <td><input type="number" step="any" class="vw-height-start" value="${hstart}"></td>
            <td><input type="number" step="any" class="vw-length" value="${length}"></td>
            <td><input type="text" class="vw-name" value="${name}"></td>
            <td><input type="number" step="any" class="vw-volume" value="${volume}" ${volumeReadonly} ${volumeBg}></td>
            <td><input type="number" step="any" class="vw-lpc" value="${lper}" readonly style="background:#f0f0f0;"></td>
            <td><button onclick="removeRow(this)">Delete</button></td>
        </tr>
    `;
}

function addHorizontalRow(containerId) {
    const tbody = document.querySelector(`#${containerId}-horizontal tbody`);
    if (!tbody) return;
    tbody.insertAdjacentHTML('beforeend', horizontalRowHtml(containerId));
    const newRow = tbody.lastElementChild;
    attachHorizontalRowListeners(newRow);
}

function attachHorizontalRowListeners(tr) {
    const editableCols = ['.hw-height-start', '.hw-height-end', '.hw-length', '.hw-name'];
    const getEditableInputs = () => editableCols.map(cls => tr.querySelector(`input${cls}`)).filter(Boolean);

    const getAllRows = () => {
        const tbody = tr.closest('tbody');
        return tbody ? Array.from(tbody.querySelectorAll('tr')) : [];
    };

    tr.querySelectorAll('input').forEach(input => {
        input.addEventListener('keydown', (e) => {
            const editableInputs = getEditableInputs();
            const colIndex = editableInputs.indexOf(input);
            if (colIndex === -1) return;

            if (e.key === 'Enter') {
                e.preventDefault();
                if (colIndex === editableInputs.length - 1) {
                    const rows = getAllRows();
                    const nextRow = rows[rows.indexOf(tr) + 1];
                    if (nextRow) {
                        const nextFirst = nextRow.querySelector(`input${editableCols[0]}`);
                        if (nextFirst) { nextFirst.focus(); nextFirst.select(); }
                    }
                } else {
                    editableInputs[colIndex + 1].focus();
                    editableInputs[colIndex + 1].select();
                }
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                if (colIndex < editableInputs.length - 1) { editableInputs[colIndex + 1].focus(); editableInputs[colIndex + 1].select(); }
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                if (colIndex > 0) { editableInputs[colIndex - 1].focus(); editableInputs[colIndex - 1].select(); }
            }
        });

        if (input.classList.contains('hw-height-start') ||
            input.classList.contains('hw-height-end') ||
            input.classList.contains('hw-length')) {
            input.addEventListener('input', () => calculateHorizontalDeadwood(tr));
        }
    });
}

function addVerticalRow(containerId) {
    const tbody = document.querySelector(`#${containerId}-vertical tbody`);
    if (!tbody) return;
    tbody.insertAdjacentHTML('beforeend', verticalRowHtml(containerId));
    const newRow = tbody.lastElementChild;
    attachVerticalRowListeners(newRow);
}

function onVerticalMethodChange(select) {
    const tr = select.closest('tr');
    const isManual = select.value === 'manual';
    const areaInput = tr.querySelector('.vw-area');
    const volumeInput = tr.querySelector('.vw-volume');
    if (isManual) {
        areaInput.disabled = true;
        areaInput.style.background = '#f0f0f0';
        areaInput.style.color = '#999';
        areaInput.value = '';
        volumeInput.removeAttribute('readonly');
        volumeInput.style.background = '';
        volumeInput.value = '';
    } else {
        areaInput.disabled = false;
        areaInput.style.background = '';
        areaInput.style.color = '';
        volumeInput.setAttribute('readonly', true);
        volumeInput.style.background = '#f0f0f0';
        volumeInput.value = '';
    }
    calculateVerticalDeadwood(tr);
}

function attachVerticalRowListeners(tr) {
    const methodSelect = tr.querySelector('.vw-method');
    const isManual = () => methodSelect ? methodSelect.value === 'manual' : false;

    const getEditableCols = () => isManual()
        ? ['.vw-height-start', '.vw-length', '.vw-name', '.vw-volume']
        : ['.vw-area', '.vw-height-start', '.vw-length', '.vw-name'];

    const getEditableInputs = () => getEditableCols()
        .map(cls => tr.querySelector(`input${cls}`))
        .filter(Boolean);

    const getAllRows = () => {
        const tbody = tr.closest('tbody');
        return tbody ? Array.from(tbody.querySelectorAll('tr')) : [];
    };

    tr.querySelectorAll('input').forEach(input => {
        input.addEventListener('keydown', (e) => {
            const editableInputs = getEditableInputs();
            const colIndex = editableInputs.indexOf(input);
            if (colIndex === -1) return;

            if (e.key === 'Enter') {
                e.preventDefault();
                const isLastCol = colIndex === editableInputs.length - 1;
                if (isLastCol) {
                    const rows = getAllRows();
                    const rowIndex = rows.indexOf(tr);
                    const nextRow = rows[rowIndex + 1];
                    if (nextRow) {
                        const firstCls = getEditableCols()[0];
                        const nextFirst = nextRow.querySelector(`input${firstCls}`);
                        if (nextFirst) { nextFirst.focus(); nextFirst.select(); }
                    }
                } else {
                    editableInputs[colIndex + 1].focus();
                    editableInputs[colIndex + 1].select();
                }
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                const editableInputs2 = getEditableInputs();
                const idx = editableInputs2.indexOf(input);
                if (idx < editableInputs2.length - 1) { editableInputs2[idx + 1].focus(); editableInputs2[idx + 1].select(); }
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                const editableInputs2 = getEditableInputs();
                const idx = editableInputs2.indexOf(input);
                if (idx > 0) { editableInputs2[idx - 1].focus(); editableInputs2[idx - 1].select(); }
            }
        });

        if (input.classList.contains('vw-area') ||
            input.classList.contains('vw-length') ||
            input.classList.contains('vw-volume')) {
            input.addEventListener('input', () => calculateVerticalDeadwood(tr));
        }
    });
}

function removeRow(btn) {
    const tr = btn.closest('tr');
    if (tr) tr.remove();
}

function getDeadwoodData(containerId) {
    const horizontal = [];
    const vertical = [];
    const hbody = document.querySelectorAll(`#${containerId}-horizontal tbody tr`);
    hbody.forEach(tr => {
        horizontal.push({
            heightStart: parseFloat(tr.querySelector('.hw-height-start').value) || 0,
            heightEnd: parseFloat(tr.querySelector('.hw-height-end').value) || 0,
            length: parseFloat(tr.querySelector('.hw-length').value) || 0,
            name: tr.querySelector('.hw-name').value || '',
            volume: parseFloat(tr.querySelector('.hw-volume').value) || 0,
            litrePerCm: parseFloat(tr.querySelector('.hw-lpc').value) || 0
        });
    });

    const vbody = document.querySelectorAll(`#${containerId}-vertical tbody tr`);
    vbody.forEach(tr => {
        vertical.push({
            method: tr.querySelector('.vw-method')?.value || 'automatic',
            area: parseFloat(tr.querySelector('.vw-area').value) || 0,
            heightStart: parseFloat(tr.querySelector('.vw-height-start').value) || 0,
            length: parseFloat(tr.querySelector('.vw-length').value) || 0,
            name: tr.querySelector('.vw-name').value || '',
            volume: parseFloat(tr.querySelector('.vw-volume').value) || 0,
            litrePerCm: parseFloat(tr.querySelector('.vw-lpc').value) || 0
        });
    });

    return { horizontal, vertical };
}

function getStrappingData(containerId) {
    const container = document.getElementById(containerId);
    const rows = container.querySelectorAll(".strapping-row");
    const courses = [];

    rows.forEach(row => {
        const courseNumber = parseInt(row.dataset.course, 10);
        const position = row.dataset.position;

        const externalCircumference = parseFloat(row.querySelector(".external-circumference").value);
        const stepover = parseFloat(row.querySelector(".stepover").value);
        const plateThickness = parseFloat(row.querySelector(".plate-thickness").value);
        const tempTape = parseFloat(row.querySelector(".temp-tape").value);
        const correctionThickness = parseFloat(row.querySelector(".correction-thickness").value);
        const internalCircumference = parseFloat(row.querySelector(".internal-circumference").value);

        if ([externalCircumference, stepover, plateThickness, tempTape, correctionThickness, internalCircumference]
            .some(value => Number.isNaN(value))) {
            throw new Error(`Course ${courseNumber} ${position}: all fields must be numeric.`);
        }

        let course = courses.find(c => c.courseNumber === courseNumber);
        if (!course) {
            course = { courseNumber, rows: [] };
            courses.push(course);
        }

        course.rows.push({
            position,
            externalCircumference,
            stepover,
            plateThickness,
            tempTape,
            correctionThickness,
            internalCircumference
        });
    });

    return courses;
}

function isDuplicateTankNumber(targetCompany, tankNumber, ignoreTankId = null) {
    if (!targetCompany || !targetCompany.tanks) return false;
    return targetCompany.tanks.some(tank => {
        if (ignoreTankId && String(tank.id) === String(ignoreTankId)) return false;
        return String(tank.tankNumber).trim().toLowerCase() === String(tankNumber).trim().toLowerCase();
    });
}

async function saveTank() {
    try {
        const strappingTankSelect = document.getElementById('strappingTankSelect');
        const tankNumberInput = document.getElementById("tankNumber");
        let tankNumber = tankNumberInput ? tankNumberInput.value.trim() : "";
        const courseCount = parseInt(document.getElementById("courseCount").value, 10);
        const readingsPerCourse = parseInt(document.getElementById("readingsPerCourse").value, 10);
        const courses = getStrappingData("courseInputs");

        let targetCompany = company;
        const compSelect = document.getElementById('companySelectForStrapping');
        if (compSelect && compSelect.value) {
            const found = companies.find(c => String(c.id) === String(compSelect.value));
            if (found) targetCompany = found;
        }
        if (!targetCompany) { showMessage('No target company selected.', true); return; }

        const action = tankMode === 'strapping' ? strappingAction : 'add';

        // ── EDIT / UPDATE ──
        if (tankMode === 'strapping' && action === 'edit') {
            const selectedTankId = strappingTankSelect ? strappingTankSelect.value : null;
            if (!selectedTankId) { showMessage('Select a tank to edit.', true); return; }

            // 1. Update tank header
            await fetch(`http://localhost:3000/tanks/${selectedTankId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tank_number: tankNumber || undefined, course_count: courseCount, readings_per_course: readingsPerCourse })
            });

            // 2. Save strapping
            await fetch(`http://localhost:3000/strapping/${selectedTankId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ courses })
            });

            // 3. Save deadwood
            const deadwood = getDeadwoodData('deadwoodSection');
            await fetch(`http://localhost:3000/deadwood/${selectedTankId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(deadwood)
            });

            showMessage('Tank updated successfully.');
            editingTankId = null;
            clearStrappingForm();
            return;
        }

        // ── ADD NEW ──
        if (!tankNumber) { showMessage('Tank number is required.', true); return; }

        // 1. Create tank
        const tankRes = await fetch('http://localhost:3000/tanks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ company_id: targetCompany.id, tank_number: tankNumber, course_count: courseCount, readings_per_course: readingsPerCourse })
        });
        const newTank = await tankRes.json();

        // 2. Save strapping
        await fetch(`http://localhost:3000/strapping/${newTank.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ courses })
        });

        // 3. Save deadwood
        let deadwoodData = { horizontal: [], vertical: [] };
        try { deadwoodData = getDeadwoodData('deadwoodSection'); } catch (e) {}
        await fetch(`http://localhost:3000/deadwood/${newTank.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(deadwoodData)
        });

        showMessage("Tank saved successfully.");
        document.getElementById("tankNumber").value = "";
        document.getElementById("courseCount").value = "1";
        document.getElementById("readingsPerCourse").value = "3";
        document.getElementById("courseInputs").innerHTML = "";
        const dead = document.getElementById('deadwoodSection');
        if (dead) { dead.innerHTML = ''; dead.style.display = 'none'; }
        const deadBtn = document.getElementById('toggleDeadwoodBtn');
        if (deadBtn) deadBtn.innerText = 'Show Deadwood';
        document.getElementById("saveTankButton").style.display = "none";

    } catch (error) {
        showMessage(error.message, true);
    }
}

async function renderExistingTankList() {
    const container = document.getElementById("existingTankList");
    container.innerHTML = "";

    // Fetch tanks from DB
    const res = await fetch(`http://localhost:3000/tanks/${company.id}`);
    company.tanks = await res.json();

    if (!company.tanks.length) {
        container.innerHTML = "<p>No tanks available for this company.</p>";
        return;
    }

    container.innerHTML = `
        <input type="text" id="tankSearch" placeholder="Search tank by number"
            oninput="filterTankList()"
            style="width:100%; max-width:400px; margin-bottom:12px; padding:10px;">
        <table>
            <thead>
                <tr>
                    <th>Tank Number</th>
                    <th>Courses</th>
                    <th>Readings per Course</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody id="tankTableBody"></tbody>
        </table>
    `;

    renderTankRows(company.tanks);
}

function renderTankRows(tanks) {
    const tbody = document.getElementById("tankTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!tanks.length) {
        tbody.innerHTML = `<tr><td colspan="4">No tanks found.</td></tr>`;
        return;
    }

    tanks.forEach(tank => {
        tbody.innerHTML += `
            <tr>
                <td>${tank.tank_number}</td>
                <td>${tank.course_count}</td>
                <td>${tank.readings_per_course}</td>
                <td>
                    <button onclick="editTank(${tank.id})">Edit</button>
                    <button onclick="deleteTank(${tank.id})" style="margin-left:8px;">Delete</button>
                </td>
            </tr>
        `;
    });
}

function filterTankList() {
    const query = document.getElementById("tankSearch")?.value.trim().toLowerCase() || "";
    const filtered = company.tanks.filter(t =>
        t.tank_number.toLowerCase().includes(query)
    );
    renderTankRows(filtered);
}
async function editTank(tankId) {
    // Fetch strapping and deadwood from DB
    const [strappingRes, deadwoodRes] = await Promise.all([
        fetch(`http://localhost:3000/strapping/${tankId}`),
        fetch(`http://localhost:3000/deadwood/${tankId}`)
    ]);
    const strappingRows = await strappingRes.json();
    const deadwood = await deadwoodRes.json();

    // Convert strapping rows to format renderStrappingTable expects
    const courses = [];
    strappingRows.forEach(row => {
        let course = courses.find(c => c.courseNumber === row.course_number);
        if (!course) { course = { courseNumber: row.course_number, rows: [] }; courses.push(course); }
        course.rows.push({
            position: row.position,
            externalCircumference: row.external_circumference,
            stepover: row.stepover,
            plateThickness: row.plate_thickness,
            tempTape: row.temp_tape,
            correctionThickness: row.correction_thickness,
            internalCircumference: row.internal_circumference
        });
    });

    const deadwoodFormatted = {
        horizontal: deadwood.horizontal.map(r => ({
            heightStart: r.height_start, heightEnd: r.height_end,
            length: r.length, name: r.name, volume: r.volume, litrePerCm: r.litre_per_cm
        })),
        vertical: deadwood.vertical.map(r => ({
            method: r.method, area: r.area, heightStart: r.height_start,
            length: r.length, name: r.name, volume: r.volume, litrePerCm: r.litre_per_cm
        }))
    };

    const tank = company.tanks.find(t => t.id === tankId);
    editingTankId = tankId;
    document.getElementById("editTankSection").style.display = "block";
    document.getElementById("editTankNumber").value = tank.tank_number;

    renderStrappingTable(tank.course_count, tank.readings_per_course, "editCourseInputs", courses);

    renderDeadwoodSection("editDeadwoodSection", deadwoodFormatted);
    const editSection = document.getElementById('editDeadwoodSection');
    if (editSection) {
        editSection.style.display = 'block';
        const btn = document.getElementById('toggleEditDeadwoodBtn');
        if (btn) btn.innerText = 'Hide Deadwood';
    }
}

async function updateTank() {
    if (!editingTankId) { showMessage("No tank selected for update.", true); return; }
    try {
        const tankNumber = document.getElementById("editTankNumber").value.trim();
        if (!tankNumber) { showMessage("Tank number is required.", true); return; }

        const courses = getStrappingData("editCourseInputs");

        // 1. Update tank header
        await fetch(`http://localhost:3000/tanks/${editingTankId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tank_number: tankNumber, course_count: courses.length, readings_per_course: company.tanks.find(t => t.id === editingTankId)?.readings_per_course || 3 })
        });

        // 2. Save strapping
        await fetch(`http://localhost:3000/strapping/${editingTankId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ courses })
        });

        // 3. Save deadwood
        let deadwood = { horizontal: [], vertical: [] };
        try { deadwood = getDeadwoodData('editDeadwoodSection'); } catch (e) {}
        await fetch(`http://localhost:3000/deadwood/${editingTankId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(deadwood)
        });

        // Reload tanks for this company and re-render
        const tanksRes = await fetch(`http://localhost:3000/tanks/${company.id}`);
        company.tanks = await tanksRes.json();
        renderExistingTankList();
        showMessage("Tank updated successfully.");
        cancelTankEdit();
    } catch (error) {
        showMessage(error.message, true);
    }
}
function cancelTankEdit() {
    editingTankId = null;
    document.getElementById("editTankSection").style.display = "none";
    document.getElementById("editTankNumber").value = "";
    document.getElementById("editCourseInputs").innerHTML = "";
    const editDead = document.getElementById('editDeadwoodSection');
    if (editDead) {
        editDead.innerHTML = '';
        editDead.style.display = 'none';
    }
    const btn = document.getElementById('toggleEditDeadwoodBtn');
    if (btn) btn.innerText = 'Show Deadwood';
    showMessage("");
}

async function deleteTank(tankId) {
    const confirmed = confirm("Delete this tank?");
    if (!confirmed) return;
    try {
        await fetch(`http://localhost:3000/tanks/${tankId}`, { method: 'DELETE' });
        const tanksRes = await fetch(`http://localhost:3000/tanks/${company.id}`);
        company.tanks = await tanksRes.json();
        renderExistingTankList();
        if (editingTankId === tankId) cancelTankEdit();
        showMessage("Tank deleted successfully.");
    } catch (error) {
        showMessage("Error deleting tank", true);
    }
}

function showMessage(text, isError = false) {
    const element = document.getElementById("message");
    element.innerText = text;
    element.style.color = isError ? "#c00" : "#060";
}

function goBack() {
    window.location.href = "index.html";
}

async function saveDeadwoodForSelectedTank() {
    const tankSel = document.getElementById('tankSelectForDeadwood');
    if (!tankSel) { showMessage('Select a tank first.', true); return; }
    const tankId = tankSel.value;
    if (!tankId) { showMessage('Select a tank first.', true); return; }

    try {
        const data = getDeadwoodData('deadwoodModeSection');
        await fetch(`http://localhost:3000/deadwood/${tankId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        showMessage('Deadwood saved successfully.');
    } catch (e) {
        showMessage(e.message, true);
    }
}

// --- Deadwood calculation functions ---
function calculateHorizontalDeadwood(row) {
    const heightStartInput = row.querySelector('.hw-height-start');
    const heightEndInput = row.querySelector('.hw-height-end');
    const lengthInput = row.querySelector('.hw-length');
    const volumeInput = row.querySelector('.hw-volume');
    const litrePerCmInput = row.querySelector('.hw-lpc');

    const heightStart = parseFloat(heightStartInput.value) || 0;
    const heightEnd = parseFloat(heightEndInput.value) || 0;
    const length = parseFloat(lengthInput.value) || 0;

    // dia = height_end_at - height_start_from
    const dia = heightEnd - heightStart;

    // Volume = (3.1416 * dia * dia * length) / (4 * 1000)
    const volume = (3.1416 * dia * dia * length) / (4 * 1000);

    // Litre_per_cm = Volume_Litres / dia
    const litrePerCm = dia !== 0 ? volume / dia : 0;

    volumeInput.value = volume.toFixed(3);
    litrePerCmInput.value = litrePerCm.toFixed(3);
}

function calculateVerticalDeadwood(row) {
    const methodSelect = row.querySelector('.vw-method');
    const areaInput = row.querySelector('.vw-area');
    const lengthInput = row.querySelector('.vw-length');
    const volumeInput = row.querySelector('.vw-volume');
    const litrePerCmInput = row.querySelector('.vw-lpc');

    const method = methodSelect ? methodSelect.value : 'automatic';
    const length = parseFloat(lengthInput.value) || 0;

    let volume = 0;
    if (method === 'automatic') {
        const area = parseFloat(areaInput.value) || 0;
        volume = (area * length) / 1000;
        volumeInput.value = volume.toFixed(3);
    } else {
        // Manual: user enters volume directly, can be negative
        volume = parseFloat(volumeInput.value) || 0;
    }

    // Litre_per_cm can be negative if volume is negative
    const litrePerCm = length !== 0 ? volume / length : 0;
    litrePerCmInput.value = litrePerCm.toFixed(3);
}