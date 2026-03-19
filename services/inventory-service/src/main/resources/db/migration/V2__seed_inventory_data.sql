INSERT INTO inventory.inventory_items (material_id, material_name, current_level, max_capacity, unit, alert_threshold, alert_triggered, last_updated)
VALUES
    ('coffee_beans', 'Coffee Beans', 100000, 100000, 'g', 0.3, FALSE, NOW()),
    ('milk', 'Milk', 100000, 100000, 'ml', 0.3, FALSE, NOW()),
    ('soy_milk', 'Soy Milk', 40000, 40000, 'ml', 0.3, FALSE, NOW()),
    ('filter_paper', 'Filter Paper', 20000, 20000, 'sheets', 0.3, FALSE, NOW());
