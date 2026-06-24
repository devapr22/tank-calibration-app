let companies = [];
let editingCompanyId = null;

async function loadCompanies() {

    try {

        const response =
            await fetch("http://localhost:3000/companies");

        companies = await response.json();

        displayCompanies();

    } catch (error) {

        console.error(error);
    }
}

if (document.getElementById("companyTable")) {
    loadCompanies();
}

async function addCompany() {

    const companyName =
        document.getElementById("companyName").value;

    const contactPerson =
        document.getElementById("contactPerson").value;

    const phoneNumber =
        document.getElementById("phoneNumber").value;

    const location =
        document.getElementById("location").value;

    if (companyName === "") {
        alert("Enter Company Name");
        return;
    }

    try {

        if (editingCompanyId) {

            await fetch(
                `http://localhost:3000/companies/${editingCompanyId}`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        name: companyName,
                        contact_person: contactPerson,
                        phone_number: phoneNumber,
                        location: location
                    })
                }
            );

            editingCompanyId = null;

            document.getElementById("saveButton").innerText =
                "Save Company";

            document.getElementById("cancelButton").style.display =
                "none";

        } else {

            await fetch(
                "http://localhost:3000/companies",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        name: companyName,
                        contact_person: contactPerson,
                        phone_number: phoneNumber,
                        location: location
                    })
                }
            );
        }

        resetForm();

        await loadCompanies();

    } catch (error) {

        console.error(error);

        alert("Database Error");
    }
}

function editCompany(companyId) {

    const company =
        companies.find(
            c => c.id === companyId
        );

    if (!company) return;

    editingCompanyId = companyId;

    document.getElementById("companyName").value =
        company.name;

    document.getElementById("contactPerson").value =
        company.contact_person || "";

    document.getElementById("phoneNumber").value =
        company.phone_number || "";

    document.getElementById("location").value =
        company.location || "";

    document.getElementById("saveButton").innerText =
        "Update Company";

    document.getElementById("cancelButton").style.display =
        "inline-block";
}

async function deleteCompany(companyId) {

    const confirmed =
        confirm("Delete this company?");

    if (!confirmed) return;

    try {

        await fetch(
            `http://localhost:3000/companies/${companyId}`,
            {
                method: "DELETE"
            }
        );

        await loadCompanies();

    } catch (error) {

        console.error(error);

        alert("Error deleting company");
    }
}

function cancelEdit() {

    editingCompanyId = null;

    resetForm();

    document.getElementById("saveButton").innerText =
        "Save Company";

    document.getElementById("cancelButton").style.display =
        "none";
}

function resetForm() {

    document.getElementById("companyName").value = "";
    document.getElementById("contactPerson").value = "";
    document.getElementById("phoneNumber").value = "";
    document.getElementById("location").value = "";
}

function displayCompanies(filter = "") {

    const table =
        document.getElementById("companyTable");
        if (!table) return;
    table.innerHTML = "";

    const normalizedFilter =
        filter.trim().toLowerCase();

    companies
        .filter(company =>
            !normalizedFilter ||
            company.name.toLowerCase().includes(normalizedFilter)
        )
        .forEach(company => {

            table.innerHTML += `
                <tr>
                    <td>${company.name}</td>
                    <td>${company.contact_person || ""}</td>
                    <td>${company.phone_number || ""}</td>
                    <td>${company.location || ""}</td>
                    <td>
                        <button onclick="editCompany(${company.id})">Edit</button>
                        <button onclick="deleteCompany(${company.id})">Delete</button>
                        <button onclick="openTankPage(${company.id}, 'add')">Add Tank</button>
                        <button onclick="openTankPage(${company.id}, 'edit')">Edit Tanks</button>
                    </td>
                </tr>
            `;
        });
}

function searchCompanies() {
    const query = document.getElementById('companySearch')?.value || "";
    displayCompanies(query);
}

function openTankPage(companyId, mode){
    localStorage.setItem("selectedCompany", companyId);
    localStorage.setItem("tankMode", mode);
    window.location.href = "tank.html";
}

function showCompanies(){
    // Open the company details page
    window.location.href = 'company.html';
}

function openStrapping(){
    localStorage.removeItem('selectedCompany');
    localStorage.setItem('tankMode', 'strapping');
    window.location.href = 'tank.html';
}

function openDeadwoods(){
    localStorage.removeItem('selectedCompany');
    localStorage.setItem('tankMode', 'deadwood');
    window.location.href = 'tank.html';
}

async function updateDashboardCounts() {
    const companyCountEl = document.getElementById('companyCount');
    const tankCountEl = document.getElementById('tankCount');
    const deadwoodCountEl = document.getElementById('deadwoodCount');
    if (!companyCountEl) return; // only run on index page

    if (companyCountEl) companyCountEl.innerText = companies.length;

    try {
        const res = await fetch('http://localhost:3000/counts');
        const data = await res.json();
        if (tankCountEl) tankCountEl.innerText = data.tankCount;
        if (deadwoodCountEl) deadwoodCountEl.innerText = data.deadwoodCount;
    } catch (e) {
        console.error(e);
    }
}

loadCompanies().then(() => updateDashboardCounts());