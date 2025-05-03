import { PGlite } from 'https://cdn.jsdelivr.net/npm/@electric-sql/pglite/dist/index.js';

const db = new PGlite('idb://patients-db');

(async () => {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id SERIAL PRIMARY KEY,
      name TEXT,
      age INTEGER,
      gender TEXT,
      contact TEXT,
      address TEXT,
      dob TEXT,
      history TEXT,
      historyDetails TEXT,
      bloodGroup TEXT
    );
  `);

  // Optional: Seed demo data
  const result = await db.query('SELECT COUNT(*) FROM patients');
  if (parseInt(result.rows[0].count) === 0) {
    await db.query(`
      INSERT INTO patients (name, age, gender, contact, address, dob, history, historyDetails, bloodGroup)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      'Nitya ', 24, 'Female', '0000000000', 'Alambagh, Lucknow',
      '2000-07-26', 'No', '', 'O-'
    ]);
  }

  document.getElementById('patient-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const errorDiv = document.getElementById('form-errors');
    errorDiv.innerHTML = '';
    errorDiv.style.display = 'none';

    const name = formData.get('name')?.trim();
    const age = parseInt(formData.get('age'));
    const gender = formData.get('gender')?.trim();
    const contact = formData.get('contact')?.trim();
    const dob = formData.get('dob');
    const history = formData.get('history');
    const historyDetails = history === 'Yes' ? formData.get('historyDetails')?.trim() : '';
    const bloodGroup = formData.get('bloodGroup') || '';
    const address = formData.get('address')?.trim();

    const errors = [];

    if (!name || name.length < 2) errors.push('Name must be at least 2 characters.');
    if (isNaN(age) || age < 0 || age > 120) errors.push('Age must be between 0 and 120.');
    if (!gender || !/^[A-Za-z\s]+$/.test(gender)) errors.push('Gender must contain only letters.');
    if (!/^\d{10}$/.test(contact)) errors.push('Contact must be exactly 10 digits.');
    if (!dob || new Date(dob) >= new Date()) errors.push('DOB must be a valid past date.');
    if (!address || address.length < 5) errors.push('Address must be at least 5 characters.');
    if (history === 'Yes' && (!historyDetails || historyDetails.length < 5)) {
      errors.push('Please provide at least 5 characters for health history details.');
    }

    // Age-DOB consistency check
    if (dob && !isNaN(age)) {
      const dobDate = new Date(dob);
      const today = new Date();
      let computedAge = today.getFullYear() - dobDate.getFullYear();
      if (
        today.getMonth() < dobDate.getMonth() ||
        (today.getMonth() === dobDate.getMonth() && today.getDate() < dobDate.getDate())
      ) {
        computedAge--;
      }
      if (Math.abs(computedAge - age) > 1) {
        errors.push(`Entered age (${age}) doesn't match DOB (${dob}). Expected ~${computedAge}.`);
      }
    }

    if (errors.length > 0) {
      errorDiv.innerHTML = '<ul>' + errors.map(e => `<li>${e}</li>`).join('') + '</ul>';
      errorDiv.style.display = 'block';
      errorDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    // Insert into database
    await db.query(`
      INSERT INTO patients
      (name, age, gender, contact, address, dob, history, historyDetails, bloodGroup)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [name, age, gender, contact, address, dob, history, historyDetails, bloodGroup]);

    errorDiv.innerHTML = '';
    errorDiv.style.display = 'none';

    alert('✅ Patient registered successfully!');
    e.target.reset();
    await loadTable();
  });

  document.getElementById('run-query').addEventListener('click', async () => {
    const query = document.getElementById('query-input').value;
    try {
      const result = await db.query(query);
      renderTable(result.rows);
      document.getElementById('query-result').textContent = '';
    } catch (error) {
      document.getElementById('query-result').textContent = 'Error: ' + error.message;
    }
  });

  async function loadTable() {
    const result = await db.query('SELECT * FROM patients');
    renderTable(result.rows);
  }

  function renderTable(rows) {
    const tbody = document.querySelector('#result-table tbody');
    tbody.innerHTML = '';

    rows.forEach((row) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.id}</td>
        <td>${row.name}</td>
        <td>${row.age}</td>
        <td>${row.gender}</td>
        <td>${row.contact}</td>
        <td>${row.dob || ''}</td>
        <td>${row.history || ''}</td>
        <td>${row.historydetails || ''}</td>
        <td>${row.bloodgroup || ''}</td>
        <td>${row.address}</td>
        <td><button class="delete-row" data-id="${row.id}">Delete</button></td>
      `;
      tbody.appendChild(tr);
    });

    document.querySelectorAll('.delete-row').forEach(button => {
      button.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        await db.query('DELETE FROM patients WHERE id = $1', [id]);
        await loadTable();
      });
    });
  }

  await loadTable();
})();
