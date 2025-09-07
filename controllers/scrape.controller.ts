import { Request, Response } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

// Enhanced scraping method that crawls multiple pages
const scrapeWithCheerio = async (url: string): Promise<string> => {
  try {
    const baseUrl = new URL(url);
    const domain = baseUrl.hostname;
    const visitedUrls = new Set<string>();
    const allContent: string[] = [];
    
    // Function to scrape a single page
    const scrapePage = async (pageUrl: string): Promise<{ content: string; links: string[]; title: string }> => {
      if (visitedUrls.has(pageUrl)) {
        return { content: '', links: [], title: '' };
      }
      
      visitedUrls.add(pageUrl);
      console.log(`Scraping page: ${pageUrl}`);
      
      try {
        const response = await axios.get(pageUrl, {
          timeout: 20000, // Increased timeout
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          }
        });

        const $ = cheerio.load(response.data);
        
        // Remove unwanted elements
        $('script, style, noscript, iframe, img, svg, video, audio, nav, header, footer, .nav, .header, .footer, .sidebar, .menu, .navigation, .breadcrumb, .pagination, .social-share, .advertisement, .ads, .banner').remove();
        
        // Extract title
        const title = $('title').text().trim() || $('h1').first().text().trim();
        
        // Extract text from various content areas with priority
        const contentSelectors = [
          'main',
          'article',
          '.content',
          '.main-content',
          '#content',
          '#main',
          '.post-content',
          '.entry-content',
          '.article-content',
          '.page-content',
          'section',
          'div[role="main"]',
          '.container',
          '.wrapper'
        ];

        let content = '';
        
        // Try to find main content area first
        for (const selector of contentSelectors) {
          const element = $(selector);
          if (element.length > 0) {
            content = element.text();
            if (content.trim().length > 200) { // Ensure we have substantial content
              break;
            }
          }
        }

        // If no main content found, use body text but filter out navigation
        if (!content.trim() || content.trim().length < 200) {
          // Remove navigation elements from body
          $('nav, .nav, .navigation, .menu, .breadcrumb, .pagination, .social-share, .advertisement, .ads, .banner').remove();
          content = $('body').text();
        }

        // Clean up the text more thoroughly
        content = content
          .replace(/\s+/g, ' ')
          .replace(/\n+/g, '\n')
          .trim()
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 3) // Increased minimum length
          .filter(line => !line.match(/^(cookie|privacy|terms|contact|about|home|login|sign|menu|navigation|skip|jump|©|copyright|all rights reserved|subscribe|newsletter|follow us|share|like|comment)$/i))
          .join('\n');

        // Extract links for further crawling
        const links: string[] = [];
        $('a[href]').each((_, element) => {
          const href = $(element).attr('href');
          if (href) {
            try {
              const fullUrl = new URL(href, pageUrl).href;
              // Only include links from the same domain and avoid common non-content pages
              if (fullUrl.includes(domain) && 
                  !visitedUrls.has(fullUrl) &&
                  !fullUrl.includes('#') &&
                  !fullUrl.includes('javascript:') &&
                  !fullUrl.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|jpg|jpeg|png|gif|mp4|avi|mov)$/i) &&
                  !fullUrl.match(/\/(login|signup|register|cart|checkout|admin|dashboard|profile|account|settings|logout|search|tag|category|archive|feed|rss|sitemap|robots\.txt)$/i)) {
                links.push(fullUrl);
              }
            } catch (e) {
              // Skip invalid URLs
            }
          }
        });

        return { content, links, title };
      } catch (error: any) {
        console.error(`Failed to scrape ${pageUrl}:`, error.message);
        return { content: '', links: [], title: '' };
      }
    };

            // Start with the main page
        const mainPage = await scrapePage(url);
        if (mainPage.content) {
          allContent.push(mainPage.content);
        }

        // Crawl additional pages (limit to avoid overwhelming)
        const pagesToCrawl = mainPage.links.slice(0, 15); // Increased to 15 additional pages
        console.log(`Found ${pagesToCrawl.length} additional pages to crawl`);

        for (const link of pagesToCrawl) {
          if (visitedUrls.size >= 25) break; // Increased maximum to 25 pages total
          
          const pageResult = await scrapePage(link);
          if (pageResult.content && pageResult.content.length > 150) { // Increased minimum content length
            allContent.push(pageResult.content);
          }
          
          // Add a small delay to be respectful
          await new Promise(resolve => setTimeout(resolve, 300)); // Reduced delay
        }

    return allContent.join('\n\n');
  } catch (error) {
    console.error('Multi-page Cheerio scraping failed:', error);
    throw error;
  }
};

// Enhanced scraping with multiple methods
export const scrapeWebsite = async (req: Request, res: Response) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'Missing URL' });
  }

  // Validate URL format
  try {
    new URL(url);
  } catch (error) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  try {
    console.log(`Starting scrape for URL: ${url}`);
    
    // Method 1: Try Apify first (better for multi-page crawling)
    let content = '';
    let method = '';
    
    const APIFY_TOKEN = process.env.APIFY_API_TOKEN || 'apify_api_yG8CvcJHJVfJ70anOJFZ4gRt2ycEek46Hw4g';
    
    if (APIFY_TOKEN) {
      try {
        console.log('Using Apify web scraper for multi-page crawling...');
        
        // Method 1a: Try direct API call first (more reliable)
        try {
          const apifyInput = {
            startUrls: [{ url }],
            pageFunction: `async function pageFunction(context) {
              const $ = context.jQuery;
              
              // Remove unwanted elements
              $('script, style, noscript, iframe, img, svg, video, audio, nav, header, footer, .nav, .header, .footer, .sidebar, .menu, .navigation, .breadcrumb, .pagination, .social-share, .advertisement, .ads, .banner').remove();
              
              // Extract title
              const title = $('title').text().trim() || $('h1').first().text().trim();
              
              // Try to find main content areas with priority
              let content = '';
              const contentSelectors = [
                'main',
                'article',
                '.content',
                '.main-content',
                '#content',
                '#main',
                '.post-content',
                '.entry-content',
                '.article-content',
                '.page-content',
                'section',
                'div[role="main"]',
                '.container',
                '.wrapper'
              ];
              
              for (const selector of contentSelectors) {
                const element = $(selector);
                if (element.length > 0) {
                  content = element.text();
                  if (content.trim().length > 200) { // Ensure substantial content
                    break;
                  }
                }
              }
              
              // If no main content found, use body text but filter navigation
              if (!content.trim() || content.trim().length < 200) {
                $('nav, .nav, .navigation, .menu, .breadcrumb, .pagination, .social-share, .advertisement, .ads, .banner').remove();
                content = $('body').text();
              }
              
              // Clean up the text more thoroughly
              content = content
                .replace(/\\s+/g, ' ')
                .replace(/\\n+/g, '\\n')
                .trim()
                .split('\\n')
                .map(line => line.trim())
                .filter(line => line.length > 3) // Increased minimum length
                .filter(line => !line.match(/^(cookie|privacy|terms|contact|about|home|login|sign|menu|navigation|skip|jump|©|copyright|all rights reserved|subscribe|newsletter|follow us|share|like|comment)$/i))
                .join('\\n');
              
              return {
                url: context.request.url,
                title: title,
                content: content,
                domain: new URL(context.request.url).hostname,
                timestamp: new Date().toISOString()
              };
            }`,
            injectJQuery: true,
            proxyConfiguration: { useApifyProxy: true },
            maxPagesPerCrawl: 30, // Increased to crawl more pages
            maxRequestRetries: 3,
            requestTimeoutSecs: 45,
            maxConcurrency: 2,
            headless: true,
            linkSelector: 'a[href]', // Follow links
            globs: [`${new URL(url).origin}/**`], // Follow links on same domain
            exclude: [
              '**/*.pdf',
              '**/*.doc',
              '**/*.docx',
              '**/*.xls',
              '**/*.xlsx',
              '**/*.ppt',
              '**/*.pptx',
              '**/*.zip',
              '**/*.rar',
              '**/*.jpg',
              '**/*.jpeg',
              '**/*.png',
              '**/*.gif',
              '**/*.mp4',
              '**/*.avi',
              '**/*.mov',
              '**/login*',
              '**/signup*',
              '**/register*',
              '**/cart*',
              '**/checkout*',
              '**/admin*',
              '**/dashboard*',
              '**/profile*',
              '**/account*',
              '**/settings*',
              '**/logout*',
              '**/search*',
              '**/tag*',
              '**/category*',
              '**/archive*',
              '**/feed*',
              '**/rss*',
              '**/sitemap*',
              '**/robots.txt'
            ]
          };

          console.log('Starting Apify API call...');
          const apifyResponse = await axios.post(
            `https://api.apify.com/v2/acts/apify~web-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}`,
            apifyInput,
            {
              timeout: 120000, // 2 minutes timeout for multi-page crawling
              headers: {
                'Content-Type': 'application/json'
              }
            }
          );

          if (apifyResponse.data && Array.isArray(apifyResponse.data)) {
            content = apifyResponse.data
              .map((item: any) => {
                const itemContent = item.content || item.text || '';
                return itemContent;
              })
              .filter(Boolean)
              .join('\n\n');
              
            method = 'apify-api';
            console.log(`Apify API scraping successful, got ${content.length} characters from ${apifyResponse.data.length} pages`);
          } else {
            throw new Error('Invalid response from Apify API');
          }
        } catch (apiError) {
          console.log('Apify API failed, trying client method...');
          
          // Method 1b: Fallback to Apify client
          const { ApifyClient } = await import('apify-client');
          const client = new ApifyClient({ token: APIFY_TOKEN });
          
          const input = {
            startUrls: [{ url }],
            pageFunction: `async function pageFunction(context) {
              const $ = context.jQuery;
              
              // Remove unwanted elements
              $('script, style, noscript, iframe, img, svg, video, audio, nav, header, footer, .nav, .header, .footer, .sidebar, .menu, .navigation, .breadcrumb, .pagination, .social-share, .advertisement, .ads, .banner').remove();
              
              // Extract title
              const title = $('title').text().trim() || $('h1').first().text().trim();
              
              // Try to find main content areas with priority
              let content = '';
              const contentSelectors = [
                'main',
                'article',
                '.content',
                '.main-content',
                '#content',
                '#main',
                '.post-content',
                '.entry-content',
                '.article-content',
                '.page-content',
                'section',
                'div[role="main"]',
                '.container',
                '.wrapper'
              ];
              
              for (const selector of contentSelectors) {
                const element = $(selector);
                if (element.length > 0) {
                  content = element.text();
                  if (content.trim().length > 200) { // Ensure substantial content
                    break;
                  }
                }
              }
              
              // If no main content found, use body text but filter navigation
              if (!content.trim() || content.trim().length < 200) {
                $('nav, .nav, .navigation, .menu, .breadcrumb, .pagination, .social-share, .advertisement, .ads, .banner').remove();
                content = $('body').text();
              }
              
              // Clean up the text more thoroughly
              content = content
                .replace(/\\s+/g, ' ')
                .replace(/\\n+/g, '\\n')
                .trim()
                .split('\\n')
                .map(line => line.trim())
                .filter(line => line.length > 3) // Increased minimum length
                .filter(line => !line.match(/^(cookie|privacy|terms|contact|about|home|login|sign|menu|navigation|skip|jump|©|copyright|all rights reserved|subscribe|newsletter|follow us|share|like|comment)$/i))
                .join('\\n');
              
              return {
                url: context.request.url,
                title: title,
                content: content,
                domain: new URL(context.request.url).hostname,
                timestamp: new Date().toISOString()
              };
            }`,
            injectJQuery: true,
            proxyConfiguration: { useApifyProxy: true },
            maxPagesPerCrawl: 30, // Increased to crawl more pages
            maxRequestRetries: 3,
            requestTimeoutSecs: 45,
            maxConcurrency: 2,
            headless: true,
            linkSelector: 'a[href]', // Follow links
            globs: [`${new URL(url).origin}/**`], // Follow links on same domain
            exclude: [
              '**/*.pdf',
              '**/*.doc',
              '**/*.docx',
              '**/*.xls',
              '**/*.xlsx',
              '**/*.ppt',
              '**/*.pptx',
              '**/*.zip',
              '**/*.rar',
              '**/*.jpg',
              '**/*.jpeg',
              '**/*.png',
              '**/*.gif',
              '**/*.mp4',
              '**/*.avi',
              '**/*.mov',
              '**/login*',
              '**/signup*',
              '**/register*',
              '**/cart*',
              '**/checkout*',
              '**/admin*',
              '**/dashboard*',
              '**/profile*',
              '**/account*',
              '**/settings*',
              '**/logout*',
              '**/search*',
              '**/tag*',
              '**/category*',
              '**/archive*',
              '**/feed*',
              '**/rss*',
              '**/sitemap*',
              '**/robots.txt'
            ]
          };

          console.log('Starting Apify client web scraper...');
          const run = await client.actor('apify~web-scraper').call(input);
          console.log('Apify run completed, fetching results...');
          
          const { items } = await client.dataset(run.defaultDatasetId).listItems();

          content = items
            .map((item: any) => {
              const itemContent = item.content || item.text || '';
              return itemContent;
            })
            .filter(Boolean)
            .join('\n\n');
            
          method = 'apify-client';
          console.log(`Apify client scraping successful, got ${content.length} characters from ${items.length} pages`);
        }
      } catch (apifyError) {
        console.error('All Apify methods failed:', apifyError);
        console.log('Falling back to Cheerio...');
        
        // Method 2: Fallback to Cheerio if Apify fails
        try {
          content = await scrapeWithCheerio(url);
          method = 'cheerio';
          console.log(`Cheerio scraping successful, got ${content.length} characters`);
        } catch (cheerioError) {
          throw new Error('All scraping methods failed');
        }
      }
    } else {
      console.log('No Apify token, using Cheerio...');
      try {
        content = await scrapeWithCheerio(url);
        method = 'cheerio';
        console.log(`Cheerio scraping successful, got ${content.length} characters`);
      } catch (cheerioError) {
        throw new Error('All scraping methods failed');
      }
    }

    // Validate content
    if (!content || content.length < 100) {
      return res.status(400).json({ 
        error: 'Insufficient content scraped', 
        message: 'The website appears to have very little text content or may be blocking scraping attempts.' 
      });
    }

    // Format content for better readability
    const formattedContent = formatScrapedContent(content, url);

    return res.status(200).json({ 
      content: formattedContent,
      method,
      originalLength: content.length,
      formattedLength: formattedContent.length
    });

  } catch (err: any) {
    console.error('Scrape error:', err.message);
    return res.status(500).json({ 
      error: 'Scraping failed', 
      message: err.message,
      suggestion: 'Try using manual content input or check if the website allows scraping'
    });
  }
};

// Test endpoint for scraping functionality
export const testScrape = async (req: Request, res: Response) => {
  const { url } = req.query;
  
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ 
      error: 'Missing or invalid URL parameter',
      example: '/api/scrape/test?url=https://example.com'
    });
  }

  try {
    console.log(`Testing scrape for URL: ${url}`);
    
    // Test with a simple website first
    const testUrl = 'https://httpbin.org/html';
    const response = await axios.get(testUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const testContent = $('body').text().trim();

    return res.status(200).json({
      success: true,
      message: 'Scraping functionality is working',
      testUrl,
      testContentLength: testContent.length,
      testContentPreview: testContent.substring(0, 200) + '...',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Test scrape error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Test scraping failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Helper function to format scraped content
const formatScrapedContent = (content: string, url: string): string => {
  const domain = new URL(url).hostname;
  
  // Clean the content by removing specific unwanted patterns
  let cleanedContent = content
    // Remove page headers and metadata
    .replace(/===.*?===/g, '')
    .replace(/Title:.*?\n/g, '')
    .replace(/🌐 CONTENT SCRAPED FROM WEBSITE.*?================================================================================/gs, '')
    .replace(/================================================================================.*?Content processing completed.*?AI training/gs, '')
    
    // Remove navigation and footer elements
    .replace(/Quick Links.*?$/gm, '')
    .replace(/Connect.*?$/gm, '')
    .replace(/©.*?All Rights Reserved.*?$/gm, '')
    .replace(/.*@.*\.com.*?$/gm, '')
    .replace(/.*Pune.*Maharashtra.*?$/gm, '')
    .replace(/.*Algoqube Solution.*?$/gm, '')
    
    // Remove common non-content text
    .replace(/^(cookie|privacy|terms|contact|about|home|login|sign|menu|navigation|skip|jump|subscribe|newsletter|follow us|share|like|comment|loading|please wait|error|not found|404|500|unauthorized|forbidden)$/gmi, '')
    
    // Clean up extra whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/^\s+|\s+$/gm, '')
    .trim();

  // Split into paragraphs and filter out empty or very short lines
  const paragraphs = cleanedContent
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 20) // Keep content with at least 20 characters
    .filter(line => !line.match(/^[0-9]+$/)) // Remove single numbers
    .slice(0, 200); // Limit to 200 paragraphs

  // Return only clean content without metadata
  return paragraphs.join('\n\n');
};
