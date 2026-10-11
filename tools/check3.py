import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]
        pg = await b.new_page(viewport={'width':1360,'height':900})
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append('console: '+m.text) if m.type=='error' and 'fonts.googleapis' not in m.text else None)
        await pg.goto('http://localhost:8765/build/webtest/index.html'); await pg.wait_for_timeout(800)
        routes=['dashboard','members','attendance','followup','giving','comms','children','reports','settings']
        for r in routes:
            await pg.click(f'button[data-act=goto][data-route={r}]'); await pg.wait_for_timeout(120)
        await pg.click('button[data-act=goto][data-route=settings]'); await pg.wait_for_timeout(150)
        code_shown = await pg.evaluate("document.body.innerText.includes('AB12CD34')")
        await pg.click('button[data-act=goto][data-route=members]'); await pg.wait_for_timeout(150)
        await pg.click('button[data-act=editMember][data-id="ex-m-15"]'); await pg.fill('#f-cell','Zone B'); await pg.click('button[data-act=submitModal]'); await pg.wait_for_timeout(200)
        writes = await pg.evaluate("window.__writes")
        signout_btn = await pg.evaluate("!!document.querySelector('[data-act=signOut]')")
        await pg.click('[data-act=signOut]'); await pg.click('button[data-act=confirmYes]'); await pg.wait_for_timeout(100)
        out = await pg.evaluate("window.__signedOut === true")
        await pg.screenshot(path='shots/web-settings.png')
        print('church code shown', code_shown, '| writes', writes, '| signout button', signout_btn, '| signed out', out, '| errors', errs)
        await b.close()
asyncio.run(main())
