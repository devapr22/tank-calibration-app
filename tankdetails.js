const API = "https://tank-calibration-app.onrender.com";
let selectedTankId = null;
let courseCount = 0;

async function init() {
    const res = await fetch(`${API}/companies`);
    const companies = await res.json();
    const select = document.getElementById('companySelect');
    companies.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.innerText = c.name;
        select.appendChild(opt);
    });
}

async function onCompanyChange() {
    const companyId = document.getElementById('companySelect').value;
    document.getElementById('step2').style.display = 'none';
    document.getElementById('step3').style.display = 'none';
    if (!companyId) return;

    const res = await fetch(`${API}/tanks/${companyId}`);
    const tanks = await res.json();
    const tankSelect = document.getElementById('tankSelect');
    tankSelect.innerHTML = '<option value="">-- Select Tank --</option>';
    tanks.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.innerText = t.tank_number;
        tankSelect.appendChild(opt);
    });
    document.getElementById('step2').style.display = 'block';
}

async function onTankChange() {
    const tankId = document.getElementById('tankSelect').value;
    document.getElementById('step3').style.display = 'none';
    if (!tankId) return;

    selectedTankId = tankId;

    const res = await fetch(`${API}/tanks/${tankId}/details`);
    const data = await res.json();
    const tank = data.tank;
    const existingCourses = data.courses;
    courseCount = tank.course_count;

    document.getElementById('tankTitle').innerText = `Tank: ${tank.tank_number}`;
    document.getElementById('datumHeight').value = tank.datum_height || '';
    document.getElementById('datumVolume').value = tank.datum_volume || '';
    document.getElementById('crownHeight').value = tank.crown_height || '';
    document.getElementById('crownVolume').value = tank.crown_volume || '';

    // Render one row per course based on course_count
    const tbody = document.getElementById('courseTable');
    tbody.innerHTML = '';
    for (let i = 1; i <= courseCount; i++) {
        const existing = existingCourses.find(c => c.course_number === i);
        tbody.innerHTML += `
            <tr>
                <td>Course ${i}</td>
                <td><input type="number" step="any" id="course_${i}" 
                    value="${existing ? existing.course_height || '' : ''}"
                    placeholder="Enter height"></td>
            </tr>
        `;
    }

    attachDatumCrownNavigation();
    attachCourseTableNavigation();
    document.getElementById('step3').style.display = 'block';
}

function attachDatumCrownNavigation() {
    const ids = ['datumHeight', 'datumVolume', 'crownHeight', 'crownVolume'];
    const inputs = ids
        .map(id => document.getElementById(id))
        .filter(Boolean);
    inputs.forEach((input, index) => {
        input.addEventListener('keydown', (e) => {
            if (!['Enter', 'ArrowRight', 'ArrowLeft'].includes(e.key)) return;
            e.preventDefault();
            let targetIndex = index;
            if (e.key === 'Enter' || e.key === 'ArrowRight') {
                targetIndex = Math.min(inputs.length - 1, index + 1);
            } else if (e.key === 'ArrowLeft') {
                targetIndex = Math.max(0, index - 1);
            }
            const target = inputs[targetIndex];
            if (target) {
                target.focus();
                target.select();
            }
        });
    });
}

function attachCourseTableNavigation() {
    const inputs = Array.from(document.querySelectorAll('#courseTable input'));
    inputs.forEach((input, index) => {
        input.addEventListener('keydown', (e) => {
            if (!['Enter', 'ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
            e.preventDefault();
            let targetIndex = index;
            if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                targetIndex = Math.min(inputs.length - 1, index + 1);
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                targetIndex = Math.max(0, index - 1);
            }
            const target = inputs[targetIndex];
            if (target) {
                target.focus();
                target.select();
            }
        });
    });
}

async function saveDetails() {
    if (!selectedTankId) return;

    try {
        // Save datum/crown values
        await fetch(`${API}/tanks/${selectedTankId}/details`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                datum_height: document.getElementById('datumHeight').value || null,
                datum_volume: document.getElementById('datumVolume').value || null,
                crown_height: document.getElementById('crownHeight').value || null,
                crown_volume: document.getElementById('crownVolume').value || null
            })
        });

        // Save course heights
        const courses = [];
        for (let i = 1; i <= courseCount; i++) {
            const input = document.getElementById(`course_${i}`);
            if (input) {
                courses.push({ course_number: i, course_height: input.value || null });
            }
        }
        await fetch(`${API}/tanks/${selectedTankId}/courses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ courses })
        });

        document.getElementById('message').innerText = 'Saved successfully.';
        document.getElementById('message').style.color = 'green';
    } catch (err) {
        document.getElementById('message').innerText = 'Error saving. Check console.';
        document.getElementById('message').style.color = 'red';
        console.error(err);
    }
}

init();