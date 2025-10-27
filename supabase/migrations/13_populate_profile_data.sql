-- Populate existing profiles with department, team, role, and expertise data

UPDATE profiles 
SET 
  department = 'Product Development',
  team = 'Frontend',
  role = 'Senior Frontend Developer',
  expertise = ARRAY['React', 'TypeScript', 'UI/UX Design']
WHERE email = 'sarah.johnson@company.com';

UPDATE profiles 
SET 
  department = 'Product Development',
  team = 'Backend',
  role = 'Backend Engineer',
  expertise = ARRAY['Node.js', 'API Design', 'Security']
WHERE email = 'michael.chen@company.com';

UPDATE profiles 
SET 
  department = 'IT',
  team = 'Database',
  role = 'Database Administrator',
  expertise = ARRAY['PostgreSQL', 'Performance Optimization', 'Database Design']
WHERE email = 'emily.rodriguez@company.com';

UPDATE profiles 
SET 
  department = 'IT',
  team = 'DevOps',
  role = 'DevOps Engineer',
  expertise = ARRAY['CI/CD', 'AWS', 'Docker', 'Kubernetes']
WHERE email = 'david.kim@company.com';

UPDATE profiles 
SET 
  department = 'Product Development',
  team = 'Architecture',
  role = 'Solutions Architect',
  expertise = ARRAY['Microservices', 'System Design', 'Cloud Architecture']
WHERE email = 'jessica.lee@company.com';

-- Add a few more demo users for better testing
INSERT INTO profiles (id, full_name, email, avatar_url, department, team, role, expertise)
VALUES 
    ('f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66'::uuid, 'Kayleigh Smith', 'kayleigh.smith@company.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kayleigh', 'Product Development', 'Product Management', 'Product Manager', ARRAY['Product Strategy', 'User Research', 'Agile']),
    ('a6eebc99-9c0b-4ef8-bb6d-6bb9bd380a77'::uuid, 'Alex Thompson', 'alex.thompson@company.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex', 'Product Development', 'Mobile', 'Mobile Developer', ARRAY['React Native', 'iOS', 'Android']),
    ('b7eebc99-9c0b-4ef8-bb6d-6bb9bd380a88'::uuid, 'Maria Garcia', 'maria.garcia@company.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria', 'Marketing', 'UX Design', 'UX Designer', ARRAY['Figma', 'User Testing', 'Prototyping']),
    ('c8eebc99-9c0b-4ef8-bb6d-6bb9bd380a99'::uuid, 'James Wilson', 'james.wilson@company.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=James', 'InfoSec', 'Security', 'Security Engineer', ARRAY['Penetration Testing', 'Security', 'Compliance']),
    ('d9eebc99-9c0b-4ef8-bb6d-6bb9bd380aaa'::uuid, 'Sophie Anderson', 'sophie.anderson@company.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie', 'IT', 'Analytics', 'Data Analyst', ARRAY['SQL', 'Python', 'Data Visualization'])
ON CONFLICT (id) DO NOTHING;
