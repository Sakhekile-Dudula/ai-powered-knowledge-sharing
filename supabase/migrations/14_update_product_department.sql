-- Update all users with "Product Central (UC)" department to "Product Development"
UPDATE profiles 
SET department = 'Product Development'
WHERE department = 'Product Central (UC)';
