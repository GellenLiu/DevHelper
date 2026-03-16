class ConditionMatcher {
  match(req, body, conditions) {
    if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
      return null;
    }

    const requestData = this.extractRequestData(req, body);

    for (const condition of conditions) {
      if (this.evaluateCondition(condition, requestData)) {
        return condition;
      }
    }

    return null;
  }

  extractRequestData(req, body) {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    
    const query = {};
    for (const [key, value] of parsedUrl.searchParams) {
      query[key] = value;
    }

    return {
      query,
      body: body || {},
      headers: req.headers || {},
      method: req.method,
      path: parsedUrl.pathname
    };
  }

  evaluateCondition(condition, requestData) {
    if (!condition.match || typeof condition.match !== 'object') {
      return false;
    }

    const matchRules = condition.match;
    
    for (const [path, rule] of Object.entries(matchRules)) {
      const actualValue = this.getValueByPath(requestData, path);
      
      if (!this.matchRule(actualValue, rule)) {
        return false;
      }
    }

    return true;
  }

  getValueByPath(obj, path) {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  matchRule(actualValue, rule) {
    if (rule === null || rule === undefined) {
      return actualValue === rule;
    }

    if (typeof rule === 'object' && !Array.isArray(rule)) {
      const operator = rule.operator || 'equals';
      const expected = rule.value;

      switch (operator) {
        case 'equals':
          return actualValue == expected;
        
        case 'notEquals':
          return actualValue != expected;
        
        case 'contains':
          if (actualValue === undefined || actualValue === null) return false;
          return String(actualValue).includes(String(expected));
        
        case 'notContains':
          if (actualValue === undefined || actualValue === null) return true;
          return !String(actualValue).includes(String(expected));
        
        case 'startsWith':
          if (actualValue === undefined || actualValue === null) return false;
          return String(actualValue).startsWith(String(expected));
        
        case 'endsWith':
          if (actualValue === undefined || actualValue === null) return false;
          return String(actualValue).endsWith(String(expected));
        
        case 'regex':
          if (actualValue === undefined || actualValue === null) return false;
          try {
            const regex = new RegExp(expected);
            return regex.test(String(actualValue));
          } catch (e) {
            return false;
          }
        
        case 'exists':
          return expected ? (actualValue !== undefined && actualValue !== null) 
                          : (actualValue === undefined || actualValue === null);
        
        case 'in':
          if (!Array.isArray(expected)) return false;
          return expected.includes(actualValue);
        
        case 'notIn':
          if (!Array.isArray(expected)) return true;
          return !expected.includes(actualValue);
        
        case 'gt':
          return Number(actualValue) > Number(expected);
        
        case 'gte':
          return Number(actualValue) >= Number(expected);
        
        case 'lt':
          return Number(actualValue) < Number(expected);
        
        case 'lte':
          return Number(actualValue) <= Number(expected);
        
        default:
          return actualValue == expected;
      }
    }

    return actualValue == rule;
  }

  getMatchedResponse(req, body, route) {
    if (!route.conditions || route.conditions.length === 0) {
      return {
        matched: false,
        response: route.response,
        delay: route.delay,
        headers: route.headers
      };
    }

    const matchedCondition = this.match(req, body, route.conditions);
    
    if (matchedCondition) {
      return {
        matched: true,
        condition: matchedCondition,
        response: matchedCondition.response !== undefined ? matchedCondition.response : route.response,
        delay: matchedCondition.delay !== undefined ? matchedCondition.delay : route.delay,
        headers: { ...route.headers, ...(matchedCondition.headers || {}) }
      };
    }

    return {
      matched: false,
      response: route.defaultResponse !== undefined ? route.defaultResponse : route.response,
      delay: route.delay,
      headers: route.headers
    };
  }

  getMatchedSSEResponse(req, body, route) {
    if (!route.conditions || route.conditions.length === 0) {
      return {
        matched: false,
        events: route.events,
        delay: route.delay,
        interval: route.interval,
        repeat: route.repeat
      };
    }

    const matchedCondition = this.match(req, body, route.conditions);
    
    if (matchedCondition) {
      return {
        matched: true,
        condition: matchedCondition,
        events: matchedCondition.events !== undefined ? matchedCondition.events : route.events,
        delay: matchedCondition.delay !== undefined ? matchedCondition.delay : route.delay,
        interval: matchedCondition.interval !== undefined ? matchedCondition.interval : route.interval,
        repeat: matchedCondition.repeat !== undefined ? matchedCondition.repeat : route.repeat
      };
    }

    return {
      matched: false,
      events: route.defaultEvents !== undefined ? route.defaultEvents : route.events,
      delay: route.delay,
      interval: route.interval,
      repeat: route.repeat
    };
  }
}

module.exports = ConditionMatcher;
