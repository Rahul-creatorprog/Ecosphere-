import express from 'express';
import { query, getOne, calculateAllScores } from './db.js';

const router = express.Router();

// Helper to award badges based on achievements
async function checkAndAwardBadges(employeeId) {
  // Get employee stats
  const employee = await getOne('SELECT * FROM employees WHERE id = ?', [employeeId]);
  if (!employee) return [];

  // Get active badges employee doesn't have yet
  const unearnedBadges = await query(`
    SELECT b.* FROM badges b
    WHERE b.id NOT IN (
      SELECT badge_id FROM employee_badges WHERE employee_id = ?
    )
  `, [employeeId]);

  const newlyAwarded = [];

  for (const badge of unearnedBadges) {
    const rule = JSON.parse(badge.unlock_rule);
    let unlock = false;

    if (rule.metric === 'xp' && employee.xp >= rule.value) {
      unlock = true;
    } else if (rule.metric === 'policies') {
      const ackCount = await getOne('SELECT COUNT(*) as count FROM policy_acknowledgements WHERE employee_id = ?', [employeeId]);
      if (ackCount.count >= rule.value) {
        unlock = true;
      }
    } else if (rule.metric === 'csr_count') {
      const csrCount = await getOne(`
        SELECT COUNT(*) as count FROM employee_participations 
        WHERE employee_id = ? AND approval_status = 'Approved'
      `, [employeeId]);
      if (csrCount.count >= rule.value) {
        unlock = true;
      }
    }

    if (unlock) {
      const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await query('INSERT INTO employee_badges (employee_id, badge_id, awarded_at) VALUES (?, ?, ?)', [employeeId, badge.id, timestamp]);
      
      // Send notification
      await query(`
        INSERT INTO notifications (employee_id, message, type, is_read, created_at)
        VALUES (?, ?, 'Badge_Unlock', 0, ?)
      `, [employeeId, `Congratulations! You have unlocked the '${badge.name}' badge!`, timestamp]);
      
      newlyAwarded.push(badge.name);
    }
  }

  return newlyAwarded;
}

// 1. Dashboard summary route
router.get('/dashboard', async (req, res) => {
  try {
    const settings = await getOne('SELECT * FROM system_settings WHERE id = 1');
    const departmentScores = await query(`
      SELECT ds.*, d.name as department_name, d.code as department_code, d.head as department_head, d.employee_count
      FROM department_scores ds
      JOIN departments d ON ds.department_id = d.id
      ORDER BY ds.total_score DESC
    `);

    // Calculate overall averages
    let avgEnv = 0, avgSoc = 0, avgGov = 0, avgTotal = 0;
    if (departmentScores.length > 0) {
      const sum = departmentScores.reduce((acc, curr) => {
        acc.env += curr.environmental_score;
        acc.soc += curr.social_score;
        acc.gov += curr.governance_score;
        acc.total += curr.total_score;
        return acc;
      }, { env: 0, soc: 0, gov: 0, total: 0 });

      const count = departmentScores.length;
      avgEnv = sum.env / count;
      avgSoc = sum.soc / count;
      avgGov = sum.gov / count;
      avgTotal = sum.total / count;
    }

    // Get notifications feed
    const notifications = await query(`
      SELECT n.*, e.name as employee_name 
      FROM notifications n 
      LEFT JOIN employees e ON n.employee_id = e.id
      ORDER BY n.id DESC LIMIT 10
    `);

    res.json({
      weights: {
        environmental: settings.weight_environmental,
        social: settings.weight_social,
        governance: settings.weight_governance
      },
      scores: {
        environmental: Math.round(avgEnv),
        social: Math.round(avgSoc),
        governance: Math.round(avgGov),
        overall: Math.round(avgTotal)
      },
      departments: departmentScores,
      notifications
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Settings management
router.get('/settings', async (req, res) => {
  try {
    const settings = await getOne('SELECT * FROM system_settings WHERE id = 1');
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const { 
      weight_environmental, 
      weight_social, 
      weight_governance, 
      enable_auto_emission, 
      enable_evidence_requirement, 
      enable_badge_auto_award 
    } = req.body;

    await query(`
      UPDATE system_settings 
      SET 
        weight_environmental = ?, 
        weight_social = ?, 
        weight_governance = ?, 
        enable_auto_emission = ?, 
        enable_evidence_requirement = ?, 
        enable_badge_auto_award = ?
      WHERE id = 1
    `, [
      weight_environmental, 
      weight_social, 
      weight_governance, 
      enable_auto_emission ? 1 : 0, 
      enable_evidence_requirement ? 1 : 0, 
      enable_badge_auto_award ? 1 : 0
    ]);

    await calculateAllScores();

    const updatedSettings = await getOne('SELECT * FROM system_settings WHERE id = 1');
    res.json({ message: 'Settings updated successfully', settings: updatedSettings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Departments
router.get('/departments', async (req, res) => {
  try {
    const list = await query('SELECT * FROM departments');
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Environmental (Carbon & Goals)
router.get('/emission-factors', async (req, res) => {
  try {
    const factors = await query('SELECT * FROM emission_factors WHERE status = "Active"');
    res.json(factors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/emission-factors', async (req, res) => {
  try {
    const { name, activity_type, factor_value, unit } = req.body;
    await query(
      'INSERT INTO emission_factors (name, activity_type, factor_value, unit) VALUES (?, ?, ?, ?)',
      [name, activity_type, factor_value, unit]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/carbon-transactions', async (req, res) => {
  try {
    const transactions = await query(`
      SELECT ct.*, ef.name as factor_name, d.name as department_name
      FROM carbon_transactions ct
      LEFT JOIN emission_factors ef ON ct.emission_factor_id = ef.id
      LEFT JOIN departments d ON ct.department_id = d.id
      ORDER BY ct.id DESC
    `);
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/carbon-transactions', async (req, res) => {
  try {
    const { source_type, source_id, emission_factor_id, quantity, department_id, transaction_date } = req.body;
    
    const settings = await getOne('SELECT enable_auto_emission FROM system_settings WHERE id = 1');
    let calculated_co2 = 0;

    if (settings.enable_auto_emission) {
      const factor = await getOne('SELECT factor_value FROM emission_factors WHERE id = ?', [emission_factor_id]);
      if (factor) {
        calculated_co2 = quantity * factor.factor_value;
      }
    } else {
      calculated_co2 = req.body.calculated_co2 || 0;
    }

    await query(`
      INSERT INTO carbon_transactions (source_type, source_id, emission_factor_id, quantity, calculated_co2, department_id, transaction_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [source_type, source_id, emission_factor_id, quantity, calculated_co2, department_id, transaction_date]);

    if (source_type === 'Manufacturing' || source_type === 'Fleet') {
      await query(`
        UPDATE environmental_goals 
        SET current_value = current_value + ? 
        WHERE title = 'Reduce Carbon Output'
      `, [calculated_co2]);
    } else if (source_type === 'Expense') {
      await query(`
        UPDATE environmental_goals 
        SET current_value = current_value + ? 
        WHERE title = 'Minimize Paper Usage'
      `, [quantity]);
    }

    await calculateAllScores();
    res.json({ success: true, calculated_co2 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/environmental-goals', async (req, res) => {
  try {
    const goals = await query('SELECT * FROM environmental_goals');
    res.json(goals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Social (CSR Activities)
router.get('/csr-activities', async (req, res) => {
  try {
    const list = await query(`
      SELECT csr.*, c.name as category_name 
      FROM csr_activities csr
      LEFT JOIN categories c ON csr.category_id = c.id
      ORDER BY csr.id DESC
    `);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/csr-activities', async (req, res) => {
  try {
    const { title, description, category_id, points_reward, start_date, end_date } = req.body;
    await query(`
      INSERT INTO csr_activities (title, description, category_id, points_reward, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [title, description, category_id, points_reward, start_date, end_date]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/csr-activities/participations', async (req, res) => {
  try {
    const participations = await query(`
      SELECT ep.*, e.name as employee_name, e.email as employee_email, d.name as department_name, csr.title as activity_title, csr.points_reward
      FROM employee_participations ep
      JOIN employees e ON ep.employee_id = e.id
      JOIN departments d ON e.department_id = d.id
      JOIN csr_activities csr ON ep.activity_id = csr.id
      ORDER BY ep.id DESC
    `);
    res.json(participations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/csr-activities/participate', async (req, res) => {
  try {
    const { employee_id, activity_id, proof_file_url } = req.body;

    const settings = await getOne('SELECT enable_evidence_requirement FROM system_settings WHERE id = 1');
    if (settings.enable_evidence_requirement && !proof_file_url) {
      return res.status(400).json({ error: 'Evidence file is required to submit CSR participation.' });
    }

    await query(`
      INSERT INTO employee_participations (employee_id, activity_id, proof_file_url, approval_status, points_earned)
      VALUES (?, ?, ?, 'Pending', 0)
    `, [employee_id, activity_id, proof_file_url || null]);

    res.json({ success: true, message: 'Participation submitted for review.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/csr-activities/participations/:id/approve', async (req, res) => {
  try {
    const { status } = req.body; // 'Approved' or 'Rejected'
    const partId = req.params.id;

    const participation = await getOne('SELECT * FROM employee_participations WHERE id = ?', [partId]);
    if (!participation) {
      return res.status(404).json({ error: 'Participation record not found.' });
    }

    if (participation.approval_status !== 'Pending') {
      return res.status(400).json({ error: 'This participation has already been processed.' });
    }

    let pointsEarned = 0;
    const todayStr = new Date().toISOString().split('T')[0];

    if (status === 'Approved') {
      const activity = await getOne('SELECT points_reward FROM csr_activities WHERE id = ?', [participation.activity_id]);
      pointsEarned = activity ? activity.points_reward : 0;

      await query(`
        UPDATE employees 
        SET points = points + ?, xp = xp + ? 
        WHERE id = ?
      `, [pointsEarned, pointsEarned, participation.employee_id]);
    }

    await query(`
      UPDATE employee_participations 
      SET approval_status = ?, points_earned = ?, completion_date = ? 
      WHERE id = ?
    `, [status, pointsEarned, status === 'Approved' ? todayStr : null, partId]);

    const act = await getOne('SELECT title FROM csr_activities WHERE id = ?', [participation.activity_id]);
    const message = status === 'Approved' 
      ? `Your participation in "${act.title}" was approved. You earned ${pointsEarned} points and XP!` 
      : `Your participation in "${act.title}" was rejected.`;

    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await query(`
      INSERT INTO notifications (employee_id, message, type, is_read, created_at)
      VALUES (?, ?, 'CSR_Approval', 0, ?)
    `, [participation.employee_id, message, timestamp]);

    let unlockedBadges = [];
    const settings = await getOne('SELECT enable_badge_auto_award FROM system_settings WHERE id = 1');
    if (settings.enable_badge_auto_award && status === 'Approved') {
      unlockedBadges = await checkAndAwardBadges(participation.employee_id);
    }

    await calculateAllScores();
    res.json({ success: true, approval_status: status, points_earned: pointsEarned, unlockedBadges });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Governance & Compliance
router.get('/policies', async (req, res) => {
  try {
    const list = await query(`
      SELECT p.*, d.name as department_name 
      FROM esg_policies p
      LEFT JOIN departments d ON p.department_id = d.id
      WHERE p.status = 'Active'
    `);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/policies', async (req, res) => {
  try {
    const { title, description, department_id, version } = req.body;
    await query(
      'INSERT INTO esg_policies (title, description, department_id, version) VALUES (?, ?, ?, ?)',
      [title, description, department_id, version]
    );

    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await query(`
      INSERT INTO notifications (employee_id, message, type, is_read, created_at)
      VALUES (NULL, ?, 'Policy_Reminder', 0, ?)
    `, [`New Governance Policy published: "${title}". Please review and acknowledge.`, timestamp]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/policies/acknowledgements', async (req, res) => {
  try {
    const acks = await query(`
      SELECT pa.*, e.name as employee_name, d.name as department_name, p.title as policy_title
      FROM policy_acknowledgements pa
      JOIN employees e ON pa.employee_id = e.id
      JOIN departments d ON e.department_id = d.id
      JOIN esg_policies p ON pa.policy_id = p.id
    `);
    res.json(acks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/policies/:id/acknowledge', async (req, res) => {
  try {
    const policyId = req.params.id;
    const { employee_id } = req.body;
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const existing = await getOne(
      'SELECT id FROM policy_acknowledgements WHERE policy_id = ? AND employee_id = ?',
      [policyId, employee_id]
    );

    if (existing) {
      return res.status(400).json({ error: 'You have already acknowledged this policy.' });
    }

    await query(
      'INSERT INTO policy_acknowledgements (policy_id, employee_id, acknowledgement_date) VALUES (?, ?, ?)',
      [policyId, employee_id, timestamp]
    );

    let unlockedBadges = [];
    const settings = await getOne('SELECT enable_badge_auto_award FROM system_settings WHERE id = 1');
    if (settings.enable_badge_auto_award) {
      unlockedBadges = await checkAndAwardBadges(employee_id);
    }

    await calculateAllScores();
    res.json({ success: true, unlockedBadges });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/audits', async (req, res) => {
  try {
    const list = await query('SELECT * FROM audits ORDER BY audit_date DESC');
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/audits', async (req, res) => {
  try {
    const { title, scope, auditor, audit_date, score, findings, status } = req.body;
    await query(`
      INSERT INTO audits (title, scope, auditor, audit_date, score, findings, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [title, scope, auditor, audit_date, score, findings, status]);
    
    await calculateAllScores();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/compliance-issues', async (req, res) => {
  try {
    const list = await query(`
      SELECT ci.*, a.title as audit_name, e.name as owner_name 
      FROM compliance_issues ci
      LEFT JOIN audits a ON ci.audit_id = a.id
      LEFT JOIN employees e ON ci.owner_id = e.id
      ORDER BY ci.id DESC
    `);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/compliance-issues', async (req, res) => {
  try {
    const { audit_id, severity, description, owner_id, due_date } = req.body;
    await query(`
      INSERT INTO compliance_issues (audit_id, severity, description, owner_id, due_date, status)
      VALUES (?, ?, ?, ?, ?, 'Open')
    `, [audit_id, severity, description, owner_id, due_date]);

    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await query(`
      INSERT INTO notifications (employee_id, message, type, is_read, created_at)
      VALUES (?, ?, 'Compliance', 0, ?)
    `, [owner_id, `URGENT: A new compliance issue has been assigned to you: "${description}". Due by: ${due_date}`, timestamp]);

    await calculateAllScores();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Gamification & Store
router.get('/leaderboard', async (req, res) => {
  try {
    const list = await query(`
      SELECT e.id, e.name, e.email, e.xp, e.points, d.name as department_name,
             (SELECT COUNT(*) FROM employee_badges WHERE employee_id = e.id) as badge_count
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      ORDER BY e.xp DESC
    `);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/badges', async (req, res) => {
  try {
    const badges = await query('SELECT * FROM badges');
    res.json(badges);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/employee-badges/:empId', async (req, res) => {
  try {
    const badges = await query(`
      SELECT b.*, eb.awarded_at 
      FROM employee_badges eb
      JOIN badges b ON eb.badge_id = b.id
      WHERE eb.employee_id = ?
    `, [req.params.empId]);
    res.json(badges);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/rewards', async (req, res) => {
  try {
    const list = await query('SELECT * FROM rewards');
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/rewards/redeem', async (req, res) => {
  try {
    const { employee_id, reward_id } = req.body;

    const employee = await getOne('SELECT points, name FROM employees WHERE id = ?', [employee_id]);
    const reward = await getOne('SELECT * FROM rewards WHERE id = ?', [reward_id]);

    if (!employee || !reward) {
      return res.status(404).json({ error: 'Employee or Reward not found.' });
    }

    if (reward.stock <= 0) {
      return res.status(400).json({ error: 'This item is out of stock.' });
    }

    if (employee.points < reward.points_required) {
      return res.status(400).json({ error: 'Insufficient points to redeem this reward.' });
    }

    await query('UPDATE employees SET points = points - ? WHERE id = ?', [reward.points_required, employee_id]);
    await query('UPDATE rewards SET stock = stock - 1 WHERE id = ?', [reward_id]);
    
    if (reward.stock - 1 <= 0) {
      await query('UPDATE rewards SET status = "Out of Stock" WHERE id = ?', [reward_id]);
    }

    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await query(`
      INSERT INTO notifications (employee_id, message, type, is_read, created_at)
      VALUES (?, ?, 'Redemption', 0, ?)
    `, [employee_id, `Redeemed "${reward.name}" for ${reward.points_required} points. Remaining: ${employee.points - reward.points_required} pts.`, timestamp]);

    res.json({ 
      success: true, 
      message: 'Redemption successful!', 
      remaining_points: employee.points - reward.points_required 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Custom Report Builder API
router.post('/reports/query', async (req, res) => {
  try {
    const { department_id, start_date, end_date, module_type, employee_id, category_id } = req.body;

    let sqlQuery = '';
    let params = [];

    if (module_type === 'Environmental') {
      sqlQuery = `
        SELECT ct.transaction_date as date, 'Carbon Transaction' as type, 
               CONCAT(ct.source_type, ' (', ct.source_id, ')') as details, 
               CONCAT(ct.calculated_co2, ' kg CO2') as metric, 
               d.name as department, e.name as employee
        FROM carbon_transactions ct
        JOIN departments d ON ct.department_id = d.id
        LEFT JOIN employees e ON d.head = e.name
        WHERE 1=1
      `;
      if (department_id) {
        sqlQuery += ' AND ct.department_id = ?';
        params.push(department_id);
      }
      if (start_date) {
        sqlQuery += ' AND ct.transaction_date >= ?';
        params.push(start_date);
      }
      if (end_date) {
        sqlQuery += ' AND ct.transaction_date <= ?';
        params.push(end_date);
      }
    } else if (module_type === 'Social') {
      sqlQuery = `
        SELECT ep.completion_date as date, 'CSR Activity' as type, 
               csr.title as details, CONCAT(ep.points_earned, ' pts') as metric, 
               d.name as department, e.name as employee
        FROM employee_participations ep
        JOIN employees e ON ep.employee_id = e.id
        JOIN departments d ON e.department_id = d.id
        JOIN csr_activities csr ON ep.activity_id = csr.id
        WHERE ep.approval_status = 'Approved'
      `;
      if (department_id) {
        sqlQuery += ' AND d.id = ?';
        params.push(department_id);
      }
      if (employee_id) {
        sqlQuery += ' AND ep.employee_id = ?';
        params.push(employee_id);
      }
      if (start_date) {
        sqlQuery += ' AND ep.completion_date >= ?';
        params.push(start_date);
      }
      if (end_date) {
        sqlQuery += ' AND ep.completion_date <= ?';
        params.push(end_date);
      }
      if (category_id) {
        sqlQuery += ' AND csr.category_id = ?';
        params.push(category_id);
      }
    } else if (module_type === 'Governance') {
      sqlQuery = `
        SELECT pa.acknowledgement_date as date, 'Policy Acknowledgement' as type,
               p.title as details, 'Acknowledged' as metric,
               d.name as department, e.name as employee
        FROM policy_acknowledgements pa
        JOIN employees e ON pa.employee_id = e.id
        JOIN departments d ON e.department_id = d.id
        JOIN esg_policies p ON pa.policy_id = p.id
        WHERE 1=1
      `;
      if (department_id) {
        sqlQuery += ' AND d.id = ?';
        params.push(department_id);
      }
      if (employee_id) {
        sqlQuery += ' AND pa.employee_id = ?';
        params.push(employee_id);
      }
    } else {
      sqlQuery = `
        SELECT transaction_date as date, 'Carbon Transaction' as type, 
               source_type as details, CONCAT(calculated_co2, ' kg CO2') as metric, 
               d.name as department, 'N/A' as employee
        FROM carbon_transactions ct
        JOIN departments d ON ct.department_id = d.id
        UNION ALL
        SELECT ep.completion_date as date, 'CSR Activity' as type, 
               csr.title as details, CONCAT(ep.points_earned, ' pts') as metric, 
               d.name as department, e.name as employee
        FROM employee_participations ep
        JOIN employees e ON ep.employee_id = e.id
        JOIN departments d ON e.department_id = d.id
        JOIN csr_activities csr ON ep.activity_id = csr.id
        WHERE ep.approval_status = 'Approved'
      `;
    }

    sqlQuery += ' ORDER BY date DESC';

    const results = await query(sqlQuery, params);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;