import mysql from 'mysql2/promise';

let pool;

export async function getDb() {
    if(!pool){
        pool = mysql.createPool({
            host : process.env.DB_HOST || 'localhost',
            user : process.env.DB_USER || 'root',
            password : process.env.DB_PASSWORD || '',
            database : process.env.DB_NAME || 'ecosphere',
            waitForConnections : true,
            connectionLimit : 10,
            queueLimit : 0
        });
    }
    return pool;
}

//match standard query calls

export async function query(sql, params) {
    const db = await getDb();
    const [results] = await db.execute(sql, params);
    return results;
}

export async function getOne(sql,params){
    const results = await query(sql,params);
    return results[0] || null;
}

export async function initDb() {
    const db = await getDb();

    //create tables in correct order

    await db.query(`
        CREATE TABLE IF NOT EXISTS departments (
            id INT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(255) NOT NULL,
            code VARCHAR(50) UNIQUE NOT NULL,
            head VARCHAR(255) NOT NULL,
            parent_department_id INT NULL,
            employee_count INT DEFAULT 0,
            status VARCHAR(50) DEFAULT 'Active',
            FOREIGN KEY (parent_department_id) REFERENCES departments(id) ON DELETE SET NULL
        );
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS categories (
            id INT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(255) NOT NULL,
            type VARCHAR(100) NOT NULL,
            status VARCHAR(50) DEFAULT 'Active'
        );
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS emission_factors (
            id INT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(255) NOT NULL,
            activity_type VARCHAR(100) NOT NULL,
            factor_value DOUBLE NOT NULL,
            unit VARCHAR(50) NOT NULL,
            status VARCHAR(50) DEFAULT 'Active'
        );
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS product_esg_profiles (
            id INT PRIMARY KEY AUTO_INCREMENT,
            product_name VARCHAR(255) NOT NULL,
            sku VARCHAR(100) UNIQUE NOT NULL,
            carbon_footprint DOUBLE DEFAULT 0.0,
            recyclability_rate DOUBLE DEFAULT 0.0,
            supplier_esg_score INT DEFAULT 0
            );
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS environmental_goals (
            id INT PRIMARY KEY AUTO_INCREMENT,
            title VARCHAR(255) NOT NULL,
            target_value DOUBLE NOT NULL,
            current_value DOUBLE DEFAULT 0.0,
            unit VARCHAR(50) NOT NULL,
            target_date DATE NOT NULL,
            status VARCHAR(50) DEFAULT 'Active'
        );
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS esg_policies (
            id INT PRIMARY KEY AUTO_INCREMENT,
            title VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            department_id INT,
            version VARCHAR(20) DEFAULT '1.0',
            status VARCHAR(50) DEFAULT 'Active',
            FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
        );
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS badges (
            id INT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            unlock_rule VARCHAR(255) NOT NULL,
            icon VARCHAR(255) DEFAULT 'Award'
        );
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS rewards (
            id INT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            points_required INT NOT NULL,
            stock INT NOT NULL DEFAULT 0,
            status VARCHAR(50) DEFAULT 'Active'
        );
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS employees (
            id INT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            department_id INT,
            xp INT DEFAULT 0,
            points INT DEFAULT 0,
            FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
        );
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS carbon_transactions (
            id INT PRIMARY KEY AUTO_INCREMENT,
            source_type VARCHAR(100) NOT NULL,
            source_id VARCHAR(100) NOT NULL,
            emission_factor_id INT,
            quantity DOUBLE NOT NULL,
            calculated_co2 DOUBLE NOT NULL,
            department_id INT,
            transaction_date DATE NOT NULL,
            FOREIGN KEY (emission_factor_id) REFERENCES emission_factors(id),
            FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
        );
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS csr_activities (
            id INT PRIMARY KEY AUTO_INCREMENT,
            title VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            category_id INT,
            points_reward INT NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            status VARCHAR(50) DEFAULT 'Active',
            FOREIGN KEY (category_id) REFERENCES categories(id)
        );
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS employee_participations (
            id INT PRIMARY KEY AUTO_INCREMENT,
            employee_id INT,
            activity_id INT,
            proof_file_url VARCHAR(500),
            approval_status VARCHAR(50) DEFAULT 'Pending',
            points_earned INT DEFAULT 0,
            completion_date DATE,
            FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
            FOREIGN KEY (activity_id) REFERENCES csr_activities(id) ON DELETE CASCADE
        );
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS challenges (
            id INT PRIMARY KEY AUTO_INCREMENT,
            title VARCHAR(255) NOT NULL,
            category_id INT,
            description TEXT NOT NULL,
            xp_reward INT NOT NULL,
            difficulty VARCHAR(50) NOT NULL,
            evidence_required TINYINT(1) DEFAULT 0,
            deadline DATE NOT NULL,
            status VARCHAR(50) DEFAULT 'Draft',
            FOREIGN KEY (category_id) REFERENCES categories(id)
        );
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS challenge_participations (
            id INT PRIMARY KEY AUTO_INCREMENT,
            challenge_id INT,
            employee_id INT,
            progress INT DEFAULT 0,
            proof_file_url VARCHAR(500),
            approval_status VARCHAR(50) DEFAULT 'Pending',
            xp_awarded INT DEFAULT 0,
            FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
            FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
        );
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS policy_acknowledgements (
            id INT PRIMARY KEY AUTO_INCREMENT,
            policy_id INT,
            employee_id INT,
            acknowledgement_date DATETIME NOT NULL,
            FOREIGN KEY (policy_id) REFERENCES esg_policies(id) ON DELETE CASCADE,
            FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
        );
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS audits (
            id INT PRIMARY KEY AUTO_INCREMENT,
            title VARCHAR(255) NOT NULL,
            scope VARCHAR(255) NOT NULL,
            auditor VARCHAR(255) NOT NULL,
            audit_date DATE NOT NULL,
            score INT NOT NULL,
            findings TEXT,
            status VARCHAR(50) DEFAULT 'Draft'
        );
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS compliance_issues (
            id INT PRIMARY KEY AUTO_INCREMENT,
            audit_id INT,
            severity VARCHAR(50) NOT NULL,
            description TEXT NOT NULL,
            owner_id INT,
            due_date DATE NOT NULL,
            status VARCHAR(50) DEFAULT 'Open',
            FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE SET NULL,
            FOREIGN KEY (owner_id) REFERENCES employees(id) ON DELETE SET NULL
        );
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS department_scores (
            id INT PRIMARY KEY AUTO_INCREMENT,
            department_id INT UNIQUE,
            environmental_score DOUBLE DEFAULT 0.0,
            social_score DOUBLE DEFAULT 0.0,
            governance_score DOUBLE DEFAULT 0.0,
            total_score DOUBLE DEFAULT 0.0,
            FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
        );
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS system_settings (
            id INT PRIMARY KEY,
            weight_environmental DOUBLE DEFAULT 0.40,
            weight_social DOUBLE DEFAULT 0.30,
            weight_governance DOUBLE DEFAULT 0.30,
            enable_auto_emission INT DEFAULT 1,
            enable_evidence_requirement INT DEFAULT 1,
            enable_badge_auto_award INT DEFAULT 1
        );
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS employee_badges (
            employee_id INT,
            badge_id INT,
            awarded_at DATETIME NOT NULL,
            PRIMARY KEY (employee_id, badge_id),
            FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
            FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE
        );
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS notifications (
            id INT PRIMARY KEY AUTO_INCREMENT,
            employee_id INT,
            message TEXT NOT NULL,
            type VARCHAR(100) NOT NULL,
            is_read INT DEFAULT 0,
            created_at DATETIME NOT NULL,
            FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
        );
    `);

    // Seed default settings if empty
    
    const [settings] = await db.query('SELECT COUNT(*) as count FROM system_settings');
    if (settings[0].count === 0) {
        await db.query(`
        INSERT INTO system_settings (id, weight_environmental, weight_social, weight_governance, enable_auto_emission, enable_evidence_requirement, enable_badge_auto_award)
        VALUES (1, 0.40, 0.30, 0.30, 1, 1, 1)
        `);
    }

    // Seed Departments

    const [depts] = await db.query('SELECT COUNT(*) as count FROM departments');
    if (depts[0].count === 0) {
        await db.query(`INSERT INTO departments (name, code, head, employee_count) VALUES ('Engineering', 'ENG', 'Rahul Dev', 12)`);
        await db.query(`INSERT INTO departments (name, code, head, employee_count) VALUES ('Operations', 'OPS', 'Gokul Krishnan', 8)`);
        await db.query(`INSERT INTO departments (name, code, head, employee_count) VALUES ('Human Resources', 'HR', 'Prakash Raj', 4)`);
        await db.query(`INSERT INTO departments (name, code, head, employee_count) VALUES ('Sales & Marketing', 'SAL', 'Deva Sagayam', 6)`);
    }

    // Seed Categories

    const [cats] = await db.query('SELECT COUNT(*) as count FROM categories');
    if (cats[0].count === 0) {
        await db.query(`INSERT INTO categories (name, type) VALUES ('Clean Energy', 'Challenge')`);
        await db.query(`INSERT INTO categories (name, type) VALUES ('Tree Planting', 'CSR Activity')`);
        await db.query(`INSERT INTO categories (name, type) VALUES ('Waste Management', 'Challenge')`);
        await db.query(`INSERT INTO categories (name, type) VALUES ('Community Service', 'CSR Activity')`);
    }

    // Seed Emission Factors

    const [efs] = await db.query('SELECT COUNT(*) as count FROM emission_factors');
    if (efs[0].count === 0) {
        await db.query(`INSERT INTO emission_factors (name, activity_type, factor_value, unit) VALUES ('Diesel Fuel', 'Fleet', 2.68, 'liters')`);
        await db.query(`INSERT INTO emission_factors (name, activity_type, factor_value, unit) VALUES ('Grid Electricity', 'Manufacturing', 0.85, 'kWh')`);
        await db.query(`INSERT INTO emission_factors (name, activity_type, factor_value, unit) VALUES ('Office Paper', 'Expense', 1.20, 'kg')`);
        await db.query(`INSERT INTO emission_factors (name, activity_type, factor_value, unit) VALUES ('Commercial Flights', 'Expense', 0.11, 'passenger-km')`);
    }

    // Seed Employees

    const [emps] = await db.query('SELECT COUNT(*) as count FROM employees');
    if (emps[0].count === 0) {
        await db.query(`INSERT INTO employees (name, email, department_id, xp, points) VALUES ('Rahul Dev', 'rahul@ecosphere.com', 1, 450, 400)`);
        await db.query(`INSERT INTO employees (name, email, department_id, xp, points) VALUES ('Gokul Krishnan', 'gokul@ecosphere.com', 2, 380, 300)`);
        await db.query(`INSERT INTO employees (name, email, department_id, xp, points) VALUES ('Prakash Raj', 'prakash@ecosphere.com', 3, 220, 200)`);
        await db.query(`INSERT INTO employees (name, email, department_id, xp, points) VALUES ('Deva Sagayam', 'deva@ecosphere.com', 4, 150, 100)`);
    }

    // Seed Badges

    const [bgs] = await db.query('SELECT COUNT(*) as count FROM badges');
    if (bgs[0].count === 0) {
        await db.query(`INSERT INTO badges (name, description, unlock_rule, icon) VALUES ('Carbon Zero Hero', 'Achieved over 300 XP in sustainability challenges', '{"metric": "xp", "value": 300}', 'Zap')`);
        await db.query(`INSERT INTO badges (name, description, unlock_rule, icon) VALUES ('Compliance Champion', 'Acknowledged all published compliance policies', '{"metric": "policies", "value": 3}', 'ShieldCheck')`);
        await db.query(`INSERT INTO badges (name, description, unlock_rule, icon) VALUES ('Social Leader', 'Participated in at least 2 CSR Activities', '{"metric": "csr_count", "value": 2}', 'Heart')`);
    }

    // Seed Rewards

    const [rws] = await db.query('SELECT COUNT(*) as count FROM rewards');
    if (rws[0].count === 0) {
        await db.query(`INSERT INTO rewards (name, description, points_required, stock) VALUES ('Stainless Steel Reusable Bottle', 'Premium insulated eco-friendly bottle', 150, 15)`);
        await db.query(`INSERT INTO rewards (name, description, points_required, stock) VALUES ('Solar Keychain Powerbank', 'Pocket-sized charger powered by sun', 250, 8)`);
        await db.query(`INSERT INTO rewards (name, description, points_required, stock) VALUES ('Plant a Tree in Your Name', 'NGO certification of a tree planted in the Western Ghats', 100, 99)`);
    }

    // Seed Environmental Goals

    const [gls] = await db.query('SELECT COUNT(*) as count FROM environmental_goals');
    if (gls[0].count === 0) {
        await db.query(`INSERT INTO environmental_goals (title, target_value, current_value, unit, target_date) VALUES ('Reduce Carbon Output', 5000.0, 1200.0, 'kg CO2', '2026-12-31')`);
        await db.query(`INSERT INTO environmental_goals (title, target_value, current_value, unit, target_date) VALUES ('Minimize Paper Usage', 800.0, 350.0, 'kg', '2026-09-30')`);
    }

    // Seed ESG Policies

    const [pols] = await db.query('SELECT COUNT(*) as count FROM esg_policies');
    if (pols[0].count === 0) {
        await db.query(`INSERT INTO esg_policies (title, description, department_id, version) VALUES ('Energy Conservation Policy', 'All computers, appliances and machinery must be shut down during non-office hours.', 1, '1.0')`);
        await db.query(`INSERT INTO esg_policies (title, description, department_id, version) VALUES ('Waste Segregation Protocol', 'Separate bins must be used for Organic, Recyclable, and Electronic waste in cafeteria and office bays.', 2, '1.2')`);
        await db.query(`INSERT INTO esg_policies (title, description, department_id, version) VALUES ('Equal Opportunity Employment', 'EcoSphere commits to gender, cultural, and ability diversity across all team hiring stages.', 3, '2.0')`);
    }

    // Seed Audits & Compliance Issues

    const [auds] = await db.query('SELECT COUNT(*) as count FROM audits');
    if (auds[0].count === 0) {
        await db.query(`INSERT INTO audits (title, scope, auditor, audit_date, score, findings, status) VALUES ('Q1 Energy Audit', 'Corporate HQ Office electricity usage', 'Apex Green Auditors', '2026-05-15', 85, 'Excellent lighting efficiency, but cooling settings need regulation.', 'Completed')`);
        await db.query(`INSERT INTO audits (title, scope, auditor, audit_date, score, findings, status) VALUES ('H1 Governance & Policy Audit', 'Employee handbook acknowledgements & training logs', 'Internal Audit Team', '2026-06-10', 92, 'Overall acknowledgement rates are solid, need focus on sales department.', 'Completed')`);
        
        await db.query(`INSERT INTO compliance_issues (audit_id, severity, description, owner_id, due_date, status) VALUES (1, 'Medium', 'AC temperature settings left at 18C overnight in Server Annex.', 1, '2026-07-20', 'Open')`);
        await db.query(`INSERT INTO compliance_issues (audit_id, severity, description, owner_id, due_date, status) VALUES (1, 'Low', 'Waste bins in cafeteria not segregated properly on floor 3.', 2, '2026-07-15', 'Open')`);
    }

    // Seed Carbon Transactions

    const [txs] = await db.query('SELECT COUNT(*) as count FROM carbon_transactions');
    if (txs[0].count === 0) {
        await db.query(`INSERT INTO carbon_transactions (source_type, source_id, emission_factor_id, quantity, calculated_co2, department_id, transaction_date) VALUES ('Fleet', 'FL-009', 1, 150.0, 402.0, 2, '2026-07-01')`);
        await db.query(`INSERT INTO carbon_transactions (source_type, source_id, emission_factor_id, quantity, calculated_co2, department_id, transaction_date) VALUES ('Manufacturing', 'MFG-99', 2, 1000.0, 850.0, 1, '2026-07-03')`);
        await db.query(`INSERT INTO carbon_transactions (source_type, source_id, emission_factor_id, quantity, calculated_co2, department_id, transaction_date) VALUES ('Expense', 'EXP-4521', 3, 50.0, 60.0, 3, '2026-07-05')`);
        await db.query(`INSERT INTO carbon_transactions (source_type, source_id, emission_factor_id, quantity, calculated_co2, department_id, transaction_date) VALUES ('Fleet', 'FL-014', 1, 200.0, 536.0, 4, '2026-07-06')`);
    }

    // Seed CSR Activities

    const [csrs] = await db.query('SELECT COUNT(*) as count FROM csr_activities');
    if (csrs[0].count === 0) {
        await db.query(`INSERT INTO csr_activities (title, description, category_id, points_reward, start_date, end_date) VALUES ('Monsoon Tree Plantation Drive', 'Join us at the municipal park to plant 500 saplings.', 2, 100, '2026-07-15', '2026-07-16')`);
        await db.query(`INSERT INTO csr_activities (title, description, category_id, points_reward, start_date, end_date) VALUES ('Blood Donation Camp', 'Annual blood donation camp organized with Red Cross.', 4, 150, '2026-07-22', '2026-07-23')`);
    }

    // Seed Employee Participations

    const [parts] = await db.query('SELECT COUNT(*) as count FROM employee_participations');
    if (parts[0].count === 0) {
        await db.query(`INSERT INTO employee_participations (employee_id, activity_id, proof_file_url, approval_status, points_earned, completion_date) VALUES (1, 1, 'proof_rahul.jpg', 'Approved', 100, '2026-07-15')`);
        await db.query(`INSERT INTO employee_participations (employee_id, activity_id, proof_file_url, approval_status, points_earned, completion_date) VALUES (2, 1, 'proof_gokul.jpg', 'Approved', 100, '2026-07-15')`);
    }

    // Seed Challenges

    const [challs] = await db.query('SELECT COUNT(*) as count FROM challenges');
    if (challs[0].count === 0) {
        await db.query(`INSERT INTO challenges (title, category_id, description, xp_reward, difficulty, evidence_required, deadline, status) VALUES ('E-Waste Recycler', 3, 'Bring in electronic waste to the recycling collection box.', 200, 'Medium', 1, '2026-07-25', 'Active')`);
        await db.query(`INSERT INTO challenges (title, category_id, description, xp_reward, difficulty, evidence_required, deadline, status) VALUES ('Eco Commuter', 1, 'Walk, bicycle, or use public transport to commute for 5 consecutive days.', 300, 'Hard', 1, '2026-07-31', 'Active')`);
    }

    // Seed Policy Acknowledgements

    const [acks] = await db.query('SELECT COUNT(*) as count FROM policy_acknowledgements');
    if (acks[0].count === 0) {
        const time = new Date().toISOString().slice(0, 19).replace('T', ' ');
        await db.query(`INSERT INTO policy_acknowledgements (policy_id, employee_id, acknowledgement_date) VALUES (1, 1, ?)`, [time]);
        await db.query(`INSERT INTO policy_acknowledgements (policy_id, employee_id, acknowledgement_date) VALUES (1, 2, ?)`, [time]);
    }

    // Seed notifications

    const [ntfs] = await db.query('SELECT COUNT(*) as count FROM notifications');
    if (ntfs[0].count === 0) {
        const time = new Date().toISOString().slice(0, 19).replace('T', ' ');
        await db.query(`INSERT INTO notifications (employee_id, message, type, is_read, created_at) VALUES (1, 'Congratulations! You unlocked the Carbon Zero Hero badge!', 'Badge_Unlock', 0, ?)`, [time]);
        await db.query(`INSERT INTO notifications (employee_id, message, type, is_read, created_at) VALUES (NULL, 'New Compliance Issue raised: AC temperature settings overnight.', 'Compliance', 0, ?)`, [time]);
    }

    // Calculate scores

    await calculateAllScores();
    }

    export async function calculateAllScores() {
    const db = await getDb();
    
    const [settingsList] = await db.query('SELECT * FROM system_settings WHERE id = 1');
    const settings = settingsList[0];
    const [departments] = await db.query('SELECT * FROM departments');

    for (const dept of departments) {

        // 1. Environmental Score

        const [emissionsResult] = await db.query('SELECT SUM(calculated_co2) as total FROM carbon_transactions WHERE department_id = ?', [dept.id]);
        const emissions = emissionsResult[0].total || 0;

        const [goals] = await db.query('SELECT * FROM environmental_goals');
        let goalCompletionSum = 0;
        for (const g of goals) {
        goalCompletionSum += g.target_value > 0 ? (g.current_value / g.target_value) * 100 : 0;
        }
        const goalCompletionRate = goals.length > 0 ? (goalCompletionSum / goals.length) : 0;

        const empCount = dept.employee_count || 1;
        const emissionFactorScore = Math.max(0, 100 - (emissions / (empCount * 10)));
        const environmentalScore = Math.min(100, Math.max(0, (0.5 * goalCompletionRate) + (0.5 * emissionFactorScore)));

        // 2. Social Score

        const [totalEmployees] = await db.query('SELECT id FROM employees WHERE department_id = ?', [dept.id]);
        const empIds = totalEmployees.map(e => e.id);

        let approvedCSRCount = 0;
        if (empIds.length > 0) {
        const csrResult = await db.query(
            `SELECT COUNT(DISTINCT employee_id) as count FROM employee_participations 
            WHERE employee_id IN (?) AND approval_status = 'Approved'`,
            [empIds]
        );
        approvedCSRCount = csrResult[0].count || 0;
        }
        const csrParticipationRate = empIds.length > 0 ? (approvedCSRCount / empIds.length) * 105 : 0; // Scaled
        const diversityScore = 85.00; 
        const socialScore = Math.min(100, Math.max(0, (0.5 * csrParticipationRate) + (0.5 * diversityScore)));

        // 3. Governance Score

        const [totalPolicies] = await db.query('SELECT COUNT(*) as count FROM esg_policies WHERE status = "Active"');
        const policyCount = totalPolicies[0].count || 1;

        let ackCount = 0;
        if (empIds.length > 0) {
        const ackResult = await db.query(
            `SELECT COUNT(*) as count FROM policy_acknowledgements WHERE employee_id IN (?)`,
            [empIds]
        );
        ackCount = ackResult[0].count || 0;
        }
        const ackRate = (empIds.length * policyCount) > 0 ? (ackCount / (empIds.length * policyCount)) * 100 : 0;

        let resolvedRate = 100.00;
        if (empIds.length > 0) {
        const [issueStats] = await db.query(
            `SELECT COUNT(*) as total, SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved 
            FROM compliance_issues WHERE owner_id IN (?)`,
            [empIds]
        );
        if (issueStats[0] && issueStats[0].total > 0) {
            resolvedRate = (issueStats[0].resolved / issueStats[0].total) * 100;
        }
        }

        const [latestAuditList] = await db.query('SELECT score FROM audits WHERE status = "Completed" ORDER BY audit_date DESC LIMIT 1');
        const auditScore = latestAuditList[0] ? latestAuditList[0].score : 80;

        const governanceScore = Math.min(100, Math.max(0, (0.4 * ackRate) + (0.4 * auditScore) + (0.2 * resolvedRate)));

        // Total Score

        const wEnv = settings.weight_environmental;
        const wSoc = settings.weight_social;
        const wGov = settings.weight_governance;
        const totalScore = (wEnv * environmentalScore) + (wSoc * socialScore) + (wGov * governanceScore);

        // Save Score (MySQL ON DUPLICATE KEY UPDATE syntax)

        await db.query(`
        INSERT INTO department_scores (department_id, environmental_score, social_score, governance_score, total_score)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            environmental_score = VALUES(environmental_score),
            social_score = VALUES(social_score),
            governance_score = VALUES(governance_score),
            total_score = VALUES(total_score)
        `, [dept.id, environmentalScore, socialScore, governanceScore, totalScore]);
    }
}