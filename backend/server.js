const express = require("express");
const pool = require("./db");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());


app.get("/", (req, res) => {
    res.send("Backend is running");
});

app.get("/test-db", async (req, res) => {

    try {

        const result =
            await pool.query("SELECT NOW()");

        res.json(result.rows);

    } catch (error) {

        console.error(error);

        res.status(500).send("Database Error");
    }

});

app.post("/companies", async (req, res) => {

    try {

       const {
    name,
    contact_person,
    phone_number,
    location
} = req.body;

const result = await pool.query(
`
INSERT INTO companies
(
    name,
    contact_person,
    phone_number,
    location
)
VALUES ($1,$2,$3,$4)
RETURNING *
`,
[
    name,
    contact_person,
    phone_number,
    location
]
);

        res.status(201).json(result.rows[0]);

    } catch (error) {

        console.error(error);

        res.status(500).send("Error creating company");
    }
});
app.get("/companies", async (req, res) => {

    try {

        const result =
            await pool.query(
                "SELECT * FROM companies ORDER BY id"
            );

        res.json(result.rows);

    } catch (error) {

        console.error(error);

        res.status(500).send("Error fetching companies");
    }
});
app.put("/companies/:id", async (req, res) => {

    try {

        const { id } = req.params;

        const {
            name,
            contact_person,
            phone_number,
            location
        } = req.body;

        const result = await pool.query(
            `
            UPDATE companies
            SET
                name = $1,
                contact_person = $2,
                phone_number = $3,
                location = $4
            WHERE id = $5
            RETURNING *
            `,
            [
                name,
                contact_person,
                phone_number,
                location,
                id
            ]
        );

        res.json(result.rows[0]);

    } catch (error) {

        console.error(error);

        res.status(500).send("Error updating company");
    }
});
app.delete("/companies/:id", async (req, res) => {

    try {

        const { id } = req.params;

        await pool.query(
            `
            DELETE FROM companies
            WHERE id = $1
            `,
            [id]
        );

        res.send("Company Deleted");

    } catch (error) {

        console.error(error);

        res.status(500).send("Error deleting company");
    }
});
// ── TANKS ──────────────────────────────────────────────

app.post("/tanks", async (req, res) => {
    try {
        const { company_id, tank_number, course_count, readings_per_course } = req.body;
        const result = await pool.query(
            `INSERT INTO tanks (company_id, tank_number, course_count, readings_per_course)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [company_id, tank_number, course_count, readings_per_course]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).send("Error creating tank");
    }
});

app.get("/tanks/:companyId", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM tanks WHERE company_id = $1 ORDER BY tank_number`,
            [req.params.companyId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching tanks");
    }
});

app.put("/tanks/:id", async (req, res) => {
    try {
        const { tank_number, course_count, readings_per_course } = req.body;
        const result = await pool.query(
            `UPDATE tanks SET tank_number=$1, course_count=$2, readings_per_course=$3 WHERE id=$4 RETURNING *`,
            [tank_number, course_count, readings_per_course, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).send("Error updating tank");
    }
});

app.delete("/tanks/:id", async (req, res) => {
    try {
        await pool.query(`DELETE FROM tanks WHERE id=$1`, [req.params.id]);
        res.send("Tank deleted");
    } catch (error) {
        console.error(error);
        res.status(500).send("Error deleting tank");
    }
});

// ── STRAPPING ──────────────────────────────────────────

app.post("/strapping/:tankId", async (req, res) => {
    const client = await pool.connect();
    try {
        const { courses } = req.body;
        await client.query("BEGIN");
        await client.query(`DELETE FROM strapping_readings WHERE tank_id=$1`, [req.params.tankId]);
        for (const course of courses) {
            for (const row of course.rows) {
                await client.query(
                    `INSERT INTO strapping_readings
                     (tank_id, course_number, position, external_circumference, stepover,
                      plate_thickness, temp_tape, correction_thickness, internal_circumference)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
                    [req.params.tankId, course.courseNumber, row.position,
                     row.externalCircumference, row.stepover, row.plateThickness,
                     row.tempTape, row.correctionThickness, row.internalCircumference]
                );
            }
        }
        await client.query("COMMIT");
        res.send("Strapping saved");
    } catch (error) {
        await client.query("ROLLBACK");
        console.error(error);
        res.status(500).send("Error saving strapping");
    } finally {
        client.release();
    }
});

app.get("/strapping/:tankId", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM strapping_readings WHERE tank_id=$1 ORDER BY course_number`,
            [req.params.tankId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching strapping");
    }
});

// ── DEADWOODS ──────────────────────────────────────────

app.post("/deadwood/:tankId", async (req, res) => {
    const client = await pool.connect();
    try {
        const { horizontal, vertical } = req.body;
        await client.query("BEGIN");
        await client.query(`DELETE FROM deadwood_horizontal WHERE tank_id=$1`, [req.params.tankId]);
        await client.query(`DELETE FROM deadwood_vertical WHERE tank_id=$1`, [req.params.tankId]);
        for (const row of horizontal) {
            await client.query(
                `INSERT INTO deadwood_horizontal
                 (tank_id, height_start, height_end, length, name, volume, litre_per_cm)
                 VALUES ($1,$2,$3,$4,$5,$6,$7)`,
                [req.params.tankId, row.heightStart, row.heightEnd,
                 row.length, row.name, row.volume, row.litrePerCm]
            );
        }
        for (const row of vertical) {
            await client.query(
                `INSERT INTO deadwood_vertical
                 (tank_id, method, area, height_start, length, name, volume, litre_per_cm)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                [req.params.tankId, row.method, row.area, row.heightStart,
                 row.length, row.name, row.volume, row.litrePerCm]
            );
        }
        await client.query("COMMIT");
        res.send("Deadwood saved");
    } catch (error) {
        await client.query("ROLLBACK");
        console.error(error);
        res.status(500).send("Error saving deadwood");
    } finally {
        client.release();
    }
});

app.get("/deadwood/:tankId", async (req, res) => {
    try {
        const horizontal = await pool.query(
            `SELECT * FROM deadwood_horizontal WHERE tank_id=$1`, [req.params.tankId]
        );
        const vertical = await pool.query(
            `SELECT * FROM deadwood_vertical WHERE tank_id=$1`, [req.params.tankId]
        );
        res.json({ horizontal: horizontal.rows, vertical: vertical.rows });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching deadwood");
    }
});

// ── DASHBOARD COUNTS ───────────────────────────────────

app.get("/counts", async (req, res) => {
    try {
        const tanks = await pool.query(`SELECT COUNT(*) FROM tanks`);
        const horiz = await pool.query(`SELECT COUNT(*) FROM deadwood_horizontal`);
        const vert = await pool.query(`SELECT COUNT(*) FROM deadwood_vertical`);
        res.json({
            tankCount: parseInt(tanks.rows[0].count),
            deadwoodCount: parseInt(horiz.rows[0].count) + parseInt(vert.rows[0].count)
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching counts");
    }
});

app.get("/tanks/:id/details", async (req, res) => {
    try {
        const tankResult = await pool.query(
            `SELECT id, tank_number, course_count, datum_height, datum_volume, crown_height, crown_volume
             FROM tanks WHERE id = $1`,
            [req.params.id]
        );
        const courseResult = await pool.query(
            `SELECT course_number, course_height FROM tank_courses
             WHERE tank_id = $1 ORDER BY course_number`,
            [req.params.id]
        );
        res.json({ tank: tankResult.rows[0], courses: courseResult.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
// ── TANK DETAILS (datum/crown + courses) ───────────────

app.put("/tanks/:id/details", async (req, res) => {
    try {
        const { datum_height, datum_volume, crown_height, crown_volume } = req.body;
        const result = await pool.query(
            `UPDATE tanks SET datum_height=$1, datum_volume=$2, crown_height=$3, crown_volume=$4 WHERE id=$5 RETURNING *`,
            [datum_height, datum_volume, crown_height, crown_volume, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error updating tank details");
    }
});

app.post("/tanks/:id/courses", async (req, res) => {
    const client = await pool.connect();
    try {
        const { courses } = req.body;
        await client.query("BEGIN");
        await client.query(`DELETE FROM tank_courses WHERE tank_id=$1`, [req.params.id]);
        for (const course of courses) {
            await client.query(
                `INSERT INTO tank_courses (tank_id, course_number, course_height)
                 VALUES ($1, $2, $3)`,
                [req.params.id, course.course_number, course.course_height]
            );
        }
        await client.query("COMMIT");
        res.send("Courses saved");
    } catch (err) {
        await client.query("ROLLBACK");
        console.error(err);
        res.status(500).send("Error saving courses");
    } finally {
        client.release();
    }
});
app.listen(3000, () => {
    console.log("Server running on port 3000");
});