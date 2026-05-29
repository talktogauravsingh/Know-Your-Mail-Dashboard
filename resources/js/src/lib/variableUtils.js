/**
 * Utilities for extracting and mapping campaign dynamic variables.
 */

const VARIABLE_REGEX = /\{\{\s*([a-zA-Z0-9_]+)(?:\|[^}]*)?\}\}/g;
const EXCLUDED_VARS = ['content'];

/**
 * Extract all dynamic variables from a text string, excluding standard template structure markers.
 */
export function extractVariables(text) {
  if (!text) return [];
  const variables = [];
  let match;
  
  // Reset regex state
  VARIABLE_REGEX.lastIndex = 0;
  
  while ((match = VARIABLE_REGEX.exec(text)) !== null) {
    const varName = match[1];
    if (!EXCLUDED_VARS.includes(varName) && !variables.includes(varName)) {
      variables.push(varName);
    }
  }
  
  return variables;
}

/**
 * Smart auto-mapping of template variables to CSV headers.
 * Looks for exact matches first, then alias groups, then substring matches.
 */
export function autoMapVariables(variables, csvHeaders) {
  const mappings = {};
  if (!variables || !csvHeaders || csvHeaders.length === 0) return mappings;
  
  variables.forEach(v => {
    const varName = typeof v === 'string' ? v : v.name;
    const lowerVarName = varName.toLowerCase();
    
    // 1. Exact Match (case-insensitive)
    const exactMatch = csvHeaders.find(h => h.toLowerCase() === lowerVarName);
    if (exactMatch) {
      mappings[varName] = exactMatch;
      return;
    }
    
    // 2. Alias Group Matches (highly common names)
    const commonAliases = {
      'name': ['name', 'fullname', 'full_name', 'customer_name', 'customername', 'recipient_name', 'recipientname', 'first_name', 'firstname', 'last_name', 'lastname'],
      'email': ['email', 'emailaddress', 'email_address', 'mail', 'mailaddress', 'mail_address'],
      'company': ['company', 'company_name', 'companyname', 'organization', 'organization_name', 'org', 'org_name'],
      'amount': ['amount', 'donation', 'donation_amount', 'donationamount', 'payment', 'payment_amount', 'price', 'total'],
      'date': ['date', 'payment_date', 'paymentdate', 'donation_date', 'donationdate', 'created_at', 'createdat'],
    };

    for (const [key, aliases] of Object.entries(commonAliases)) {
      if (lowerVarName.includes(key) || key.includes(lowerVarName)) {
        const aliasMatch = csvHeaders.find(h => {
          const lh = h.toLowerCase();
          return aliases.some(a => lh === a || lh.includes(a) || a.includes(lh));
        });
        if (aliasMatch) {
          mappings[varName] = aliasMatch;
          return;
        }
      }
    }

    // 3. Substring Matches (case-insensitive)
    const partialMatch = csvHeaders.find(h => {
      const lh = h.toLowerCase();
      return lh.includes(lowerVarName) || lowerVarName.includes(lh);
    });
    if (partialMatch) {
      mappings[varName] = partialMatch;
      return;
    }
    
    // 4. Default: unmapped
    mappings[varName] = '';
  });
  
  return mappings;
}
