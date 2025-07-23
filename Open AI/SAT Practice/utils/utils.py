import re

def preprocess(html):
    html = clean_html_with_re(html)
    return html

def clean_html_with_re(html):
    # 1. Remove all <svg>...</svg> blocks
    html = re.sub(r'<svg.*?>.*?</svg>', '', html, flags=re.DOTALL)

    # 2. Remove all tags
    html =  reomve_html_attribute(html)

    # 3. Remove empty tags like <div></div> (optional cleanup)
    html = re.sub(r'<(\w+)\s*>\s*</\1>', '', html)

    return html

def reomve_html_attribute(html):
    html =  re.sub(r'<(\w+)(\s+[^<>]*?)?>', r'<\1>', html)
    return html

