/**
 * Create sample data for testing the integration
 */

const insertSampleData = `
INSERT INTO historical_referrals (timestamp, date, week, month, raw_referral_source, normalized_referral_source, staff_name, source)
VALUES 
('2024-09-09T04:49:59.000Z', '2024-09-09', 37, '2024-09', 'Instagram, Google', 'Google', 'Unknown', 'google_forms_csv'),
('2024-09-14T12:28:04.000Z', '2024-09-14', 38, '2024-09', 'Friends', 'Friends', 'Dolly', 'google_forms_csv'),
('2024-09-15T08:41:10.000Z', '2024-09-15', 38, '2024-09', 'Google', 'Google', 'May', 'google_forms_csv'),
('2024-09-15T09:02:05.000Z', '2024-09-15', 38, '2024-09', 'Advertisment in the mall', 'Mall Advertisement', 'May', 'google_forms_csv'),
('2024-09-15T09:09:08.000Z', '2024-09-15', 38, '2024-09', 'Facebook', 'Facebook', 'Net', 'google_forms_csv'),
('2024-10-01T13:45:40.000Z', '2024-10-01', 40, '2024-10', 'Google', 'Google', 'Dolly', 'google_forms_csv'),
('2024-10-01T13:46:08.000Z', '2024-10-01', 40, '2024-10', 'Tiktok', 'TikTok', 'Dolly', 'google_forms_csv'),
('2024-11-01T13:45:40.000Z', '2024-11-01', 44, '2024-11', 'Google', 'Google', 'Dolly', 'google_forms_csv'),
('2024-11-01T13:46:08.000Z', '2024-11-01', 44, '2024-11', 'Instagram', 'Instagram', 'May', 'google_forms_csv'),
('2024-12-01T13:45:40.000Z', '2024-12-01', 48, '2024-12', 'Google', 'Google', 'Dolly', 'google_forms_csv'),
('2024-12-01T13:46:08.000Z', '2024-12-01', 48, '2024-12', 'Facebook', 'Facebook', 'Net', 'google_forms_csv'),
('2025-01-01T13:45:40.000Z', '2025-01-01', 1, '2025-01', 'Google', 'Google', 'Dolly', 'google_forms_csv'),
('2025-01-01T13:46:08.000Z', '2025-01-01', 1, '2025-01', 'Friends', 'Friends', 'May', 'google_forms_csv'),
('2025-02-01T13:45:40.000Z', '2025-02-01', 5, '2025-02', 'Google', 'Google', 'Dolly', 'google_forms_csv'),
('2025-02-01T13:46:08.000Z', '2025-02-01', 5, '2025-02', 'TikTok', 'TikTok', 'Net', 'google_forms_csv'),
('2025-03-01T13:45:40.000Z', '2025-03-01', 9, '2025-03', 'Google', 'Google', 'Dolly', 'google_forms_csv'),
('2025-03-01T13:46:08.000Z', '2025-03-01', 9, '2025-03', 'Mall Advertisement', 'Mall Advertisement', 'May', 'google_forms_csv'),
('2025-04-01T13:45:40.000Z', '2025-04-01', 14, '2025-04', 'Google', 'Google', 'Dolly', 'google_forms_csv'),
('2025-04-01T13:46:08.000Z', '2025-04-01', 14, '2025-04', 'Instagram', 'Instagram', 'Net', 'google_forms_csv'),
('2025-05-01T13:45:40.000Z', '2025-05-01', 18, '2025-05', 'Google', 'Google', 'Dolly', 'google_forms_csv'),
('2025-05-01T13:46:08.000Z', '2025-05-01', 18, '2025-05', 'Facebook', 'Facebook', 'May', 'google_forms_csv'),
('2025-06-01T13:45:40.000Z', '2025-06-01', 22, '2025-06', 'Google', 'Google', 'Dolly', 'google_forms_csv'),
('2025-06-01T13:46:08.000Z', '2025-06-01', 22, '2025-06', 'Friends', 'Friends', 'Net', 'google_forms_csv'),
('2025-07-01T13:45:40.000Z', '2025-07-01', 27, '2025-07', 'Google', 'Google', 'Dolly', 'google_forms_csv'),
('2025-07-01T13:46:08.000Z', '2025-07-01', 27, '2025-07', 'TikTok', 'TikTok', 'May', 'google_forms_csv');
`;

console.log(insertSampleData);