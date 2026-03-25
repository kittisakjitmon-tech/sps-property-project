/**
 * Text Highlight Utility for Search Results
 * Highlights matching keywords in text using React components
 */

import React from 'react'

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Smart Tokenization: Extract special keywords ('มือ 1', 'มือ 2', 'มือ1', 'มือ2') before splitting
 * Same logic as in globalSearch.js for consistency
 */
function smartTokenize(query) {
  if (!query || typeof query !== 'string') return []
  
  const normalized = query.trim().toLowerCase()
  if (!normalized) return []
  
  const tokens = []
  let remainingText = normalized
  
  // Extract special keywords: 'มือ 1', 'มือ 2', 'มือ1', 'มือ2'
  const specialPatterns = [
    /มือ\s*1/g,  // Matches 'มือ 1' or 'มือ1'
    /มือ\s*2/g,  // Matches 'มือ 2' or 'มือ2'
  ]
  
  // Find all special keywords and their positions
  const specialMatches = []
  specialPatterns.forEach((pattern) => {
    let match
    while ((match = pattern.exec(remainingText)) !== null) {
      specialMatches.push({
        text: match[0],
        index: match.index,
      })
    }
  })
  
  // Sort by index (ascending)
  specialMatches.sort((a, b) => a.index - b.index)
  
  // Extract special keywords and remaining text
  let lastIndex = 0
  specialMatches.forEach((match) => {
    // Add text before the special keyword
    if (match.index > lastIndex) {
      const beforeText = remainingText.substring(lastIndex, match.index).trim()
      if (beforeText) {
        const beforeTokens = beforeText.split(/\s+/).filter((t) => t.length > 0)
        tokens.push(...beforeTokens)
      }
    }
    
    // Add the special keyword (normalize to 'มือ 1' or 'มือ 2')
    const normalizedKeyword = match.text.replace(/\s+/g, ' ').trim()
    if (normalizedKeyword === 'มือ1' || normalizedKeyword === 'มือ 1') {
      tokens.push('มือ 1')
    } else if (normalizedKeyword === 'มือ2' || normalizedKeyword === 'มือ 2') {
      tokens.push('มือ 2')
    } else {
      tokens.push(normalizedKeyword)
    }
    
    lastIndex = match.index + match.text.length
  })
  
  // Add remaining text after the last special keyword
  if (lastIndex < remainingText.length) {
    const afterText = remainingText.substring(lastIndex).trim()
    if (afterText) {
      const afterTokens = afterText.split(/\s+/).filter((t) => t.length > 0)
      tokens.push(...afterTokens)
    }
  }
  
  // If no special keywords found, use regular split
  if (specialMatches.length === 0) {
    return normalized.split(/\s+/).filter((t) => t.length > 0)
  }
  
  return tokens.filter((t) => t.length > 0)
}

/**
 * Highlight text with search query (Multi-word support with Smart Tokenization)
 * @param {string} text - Text to highlight
 * @param {string} query - Search query (can contain multiple words)
 * @returns {Array} Array of React elements (strings and JSX elements)
 */
export function highlightText(text, query) {
  if (!text || typeof text !== 'string') return text
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return text
  }

  try {
    // Use smart tokenization to extract special keywords ('มือ 1', 'มือ 2') first
    const keywords = smartTokenize(query)

    if (keywords.length === 0) return text

    // Create regex pattern that matches any of the keywords (case-insensitive)
    // Escape special regex characters and handle multi-word keywords
    const escapedKeywords = keywords.map((keyword) => {
      // For multi-word keywords like 'มือ 1', escape spaces properly
      return escapeRegex(keyword)
    })
    
    // Use non-capturing groups for each keyword to preserve the full match
    const pattern = new RegExp(`(${escapedKeywords.join('|')})`, 'gi')

    // Split text by matches
    const parts = text.split(pattern)

    // Map parts to React elements
    return parts.map((part, index) => {
      if (!part || part.length === 0) return ''
      
      // Normalize part for comparison
      const normalizedPart = part.toLowerCase().trim()
      
      // Check if this part matches any keyword (case-insensitive, exact match for multi-word)
      const isMatch = keywords.some((keyword) => {
        const normalizedKeyword = keyword.toLowerCase().trim()
        // For multi-word keywords, check exact match
        if (normalizedKeyword.includes(' ')) {
          return normalizedPart === normalizedKeyword || normalizedPart.includes(normalizedKeyword)
        }
        // For single-word keywords, check partial match
        return normalizedPart.includes(normalizedKeyword)
      })

      if (isMatch && part.length > 0) {
        return React.createElement(
          'mark',
          {
            key: index,
            className: 'bg-yellow-200 text-black rounded-sm px-0.5 font-medium',
          },
          part
        )
      }

      return part
    })
  } catch (error) {
    console.error('highlightText error:', error)
    return text
  }
}

/**
 * Highlight text in an array of tags
 * @param {Array<string>} tags - Array of tag strings
 * @param {string} query - Search query
 * @returns {Array} Array of React elements
 */
export function highlightTags(tags, query) {
  if (!Array.isArray(tags) || tags.length === 0) return []
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return tags
  }

  try {
    return tags.map((tag, index) => {
      if (typeof tag !== 'string') return tag
      return React.createElement(
        'span',
        { key: index, className: 'inline-block' },
        highlightText(tag, query)
      )
    })
  } catch (error) {
    console.error('highlightTags error:', error)
    return tags
  }
}
