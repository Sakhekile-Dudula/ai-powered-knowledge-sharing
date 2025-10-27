-- Update all users with "Engineering" department to appropriate MRI departments
-- Moving developers to Product Development, others to IT

UPDATE profiles 
SET department = 'Product Development'
WHERE department = 'Engineering' 
  AND (role ILIKE '%developer%' OR role ILIKE '%architect%' OR team ILIKE '%frontend%' OR team ILIKE '%backend%' OR team ILIKE '%mobile%');

UPDATE profiles 
SET department = 'IT'
WHERE department = 'Engineering' 
  AND department != 'Product Development';
