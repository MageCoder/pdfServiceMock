'use strict';

const fs = require('fs');
const CDP = require('chrome-remote-interface');
const launchChrome = require('@serverless-chrome/lambda');


module.exports = class PDFService {
    static PRINT_OPTIONS_A4 = {
        'marginTop': 1,
        'marginBottom': 1,
        'marginLeft': 0,
        'marginRight': 0,
        'paperWidth': (210) / 25.4,
        'paperHeight': (297) / 25.4,
        'preferCSSPageSize': false,
        'displayHeaderFooter': true,
        'headerTemplate': '',
        'footerTemplate': ''
    };

    static CHROME_START_FLAGS = [
        '--headless',
        '--disable-gpu',
        '--hide-scrollbars',
        '--window-size=1024x768',
        '--disable-background-networking',
        '--disable-breakpad',
        '--disable-canvas-aa', 
        '--disable-client-side-phishing-detection',
        '--disable-cloud-import',
        '--disable-gpu-sandbox',
        '--disable-plugins',
        '--disable-print-preview',
        '--disable-renderer-backgrounding',
        '--disable-smooth-scrolling',
        '--disable-sync--disable-translate',
        '--disable-translate-new-ux',
        '--disable-webgl',
        '--disable-composited-antialiasing',
        '--disable-default-apps',
        '--disable-extensions-http-throttling',
        '--font-render-hinting=medium',
        '--no-default-browser-check',
        '--no-experiments',
        '--no-first-run',
        '--no-pings',
        '--prerender-from-omnibox=disabled',
        '--disk-cache-dir=/tmp/cache-dir',
        '--disk-cache-size=10000000',
        '--ipc-connection-timeout=10000',
        '--media-cache-size=10000000',
        '--single-process',
        '--no-sandbox',
        '--no-zygote'
    ];

    static INSTANCE;
    chrome;

    static instance() {
        if (!PDFService.INSTANCE) {
            PDFService.INSTANCE = new PDFService();
        }
        return PDFService.INSTANCE;
    }

    constructor() {
        console.debug(`[PDFService].constructor() called.`);
    }

    async html2PDF(html, jobId) {
        console.debug(`[PDFService].html2PDF() started.`, html);
        const base64HtmlString = html.toString('base64');
        console.debug('base64HtmlString: ', base64HtmlString);
        const url = `data:text/html;base64,${base64HtmlString}`;
        return this.toPdfBuffer(url, jobId);
    }

    async html2PDF2(html, jobId, headerTemplate, footerTemplate) {
        console.debug(`[PDFService].html2PDF2() started.`);
        const now = Date.now();
        const random = Math.floor((Math.random() * 100000) + 1);
        const tmpFileName = `/tmp/${now}-${random}.html`;
        const url = 'file://' + tmpFileName;
        try {
            fs.writeFileSync(tmpFileName, html.toString());
            return await this.toPdfBuffer(url, jobId, headerTemplate, footerTemplate);
        } catch (error) {
            console.error(error);
            throw new Error('[ERROR][PDFService] - Could not create PDF File by using a temporary file.');
        } finally {
            
            /*
            fs.unlink(tmpFileName, (error) => {
                if (error) {
                    console.log(error);
                }
            });
            */
            
        }
    }

    async url2PDF(url, jobId) {
        console.debug(`[PDFService].url2PDF() started.`);
        console.info(`[PDFService] - generate PDF for URL '${url}'`);
        return this.toPdfBuffer(url, jobId);
    }

    async toPdfBuffer(url, jobId,headerTemplate, footerTemplate) {
        console.debug(`ChromeService].toPdfBuffer() started.`);
        let Page;
        try {
            if (!this.chrome) {
                console.debug('[ChromeService] - Chrome instance does not exist Launch new one.');
                this.chrome = await launchChrome({ flags: PDFService.CHROME_START_FLAGS });
            } else {
                console.debug('[ChromeService] - Chrome instance already exists.');
            }

            if (headerTemplate || footerTemplate) {
                PDFService.PRINT_OPTIONS_A4.headerTemplate = headerTemplate;
                PDFService.PRINT_OPTIONS_A4.footerTemplate = footerTemplate;
            }

            const tab = await CDP.New({ host: '127.0.0.1', port: 9222 });
            const client = await CDP({ target: tab });
            const Network = client.Network;
            Page = client.Page;
            await Promise.all([
                Network.enable(),
                Page.enable(),
            ]);
            await Page.navigate({ url: url }, { waitUntil: 'networkidle0' });
            await Page.loadEventFired();
            const pdf = await Page.printToPDF(PDFService.PRINT_OPTIONS_A4);
            await CDP.Close({ id: tab.id });
            await client.close();
            console.info(`[PDFService]${jobId}] - PDF has been created.`);
            return new Buffer(pdf.data, 'base64');
        } catch (error) {
            console.error(error);
            throw new Error(`[ERROR][PDFService]${jobId}] - an error occurred.`);
        }
    }
}