from __future__ import annotations

import argparse
import html
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path


def to_int(value: str | None) -> int:
    try:
        return int(float(value or "0"))
    except ValueError:
        return 0


def to_float(value: str | None) -> float:
    try:
        return float(value or "0")
    except ValueError:
        return 0.0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate executive HTML test report from JUnit XML.")
    parser.add_argument("--xml", default="reports/vitest-results.xml", help="Path to JUnit XML report.")
    parser.add_argument("--out", default="reports/executive_test_report.html", help="Path for generated HTML report.")
    parser.add_argument(
        "--version-id",
        default="Studio Popłoch (c) 2026 | Pan Grzyb | ptr@o2.pl | v1.5.0",
        help="Displayed version identifier.",
    )
    parser.add_argument(
        "--types",
        default="Functional logic, audio interactions, sound source validation, UI regression contract (RTL)",
        help="Displayed test types line.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    xml_path = Path(args.xml)
    out_path = Path(args.out)
    root = ET.parse(xml_path).getroot()

    tests = to_int(root.attrib.get("tests"))
    failures = to_int(root.attrib.get("failures"))
    errors = to_int(root.attrib.get("errors"))
    runtime = to_float(root.attrib.get("time"))

    cases: list[dict[str, object]] = []
    hostname = "n/a"
    run_ts = ""

    for suite in root.findall("testsuite"):
        if hostname == "n/a":
            hostname = suite.attrib.get("hostname", "n/a")
        if not run_ts:
            run_ts = suite.attrib.get("timestamp", "")
        for tc in suite.findall("testcase"):
            name = tc.attrib.get("name", "unknown")
            classname = tc.attrib.get("classname", suite.attrib.get("name", "unknown"))
            duration = to_float(tc.attrib.get("time"))

            if tc.find("failure") is not None or tc.find("error") is not None:
                result = "Failed"
                tone = ("#C9372C", "#FFECEB")
            elif tc.find("skipped") is not None:
                result = "Skipped"
                tone = ("#7F5F01", "#FFF7D6")
            else:
                result = "Passed"
                tone = ("#1F845A", "#DCFFF1")

            cases.append(
                {
                    "name": name,
                    "classname": classname,
                    "duration": duration,
                    "result": result,
                    "tone_fg": tone[0],
                    "tone_bg": tone[1],
                    "domain": Path(classname).name,
                }
            )

    passed = sum(1 for c in cases if c["result"] == "Passed")
    skipped = sum(1 for c in cases if c["result"] == "Skipped")
    failed_or_error = len(cases) - passed - skipped
    if tests == 0:
        tests = len(cases)

    pass_rate = (passed / tests * 100.0) if tests else 0.0
    fail_rate = (failed_or_error / tests * 100.0) if tests else 0.0
    skip_rate = (skipped / tests * 100.0) if tests else 0.0

    status = "PASS" if failed_or_error == 0 else "FAIL"
    status_tone = "#1F845A" if status == "PASS" else "#C9372C"
    status_bg = "#DCFFF1" if status == "PASS" else "#FFECEB"

    risk_label = "Low"
    risk_color = "#1F845A"
    if failed_or_error > 0:
        risk_label = "High"
        risk_color = "#C9372C"
    elif skipped > 0:
        risk_label = "Medium"
        risk_color = "#7F5F01"

    if run_ts:
        try:
            run_human = datetime.fromisoformat(run_ts.replace("Z", "+00:00")).strftime("%Y-%m-%d %H:%M:%S %z")
        except ValueError:
            run_human = run_ts
    else:
        run_human = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cases_sorted = sorted(cases, key=lambda c: float(c["duration"]), reverse=True)
    slowest = "n/a"
    if cases_sorted:
        slowest = f"{cases_sorted[0]['name']} ({float(cases_sorted[0]['duration']):.3f}s)"

    by_domain: dict[str, dict[str, int]] = {}
    for c in cases:
        domain = str(c["domain"])
        by_domain.setdefault(domain, {"total": 0, "passed": 0, "failed": 0, "skipped": 0})
        by_domain[domain]["total"] += 1
        if c["result"] == "Passed":
            by_domain[domain]["passed"] += 1
        elif c["result"] == "Skipped":
            by_domain[domain]["skipped"] += 1
        else:
            by_domain[domain]["failed"] += 1

    max_dur = max((float(c["duration"]) for c in cases_sorted), default=1.0)
    if max_dur <= 0:
        max_dur = 1.0

    rows_html: list[str] = []
    for c in cases_sorted:
        rows_html.append(
            "<tr>"
            f"<td>{html.escape(str(c['name']))}</td>"
            f"<td>{html.escape(str(c['domain']))}</td>"
            f"<td>{float(c['duration']):.3f}s</td>"
            f"<td><span class='badge' style='color:{c['tone_fg']}; background:{c['tone_bg']}; border-color:{c['tone_bg']};'>{c['result']}</span></td>"
            "</tr>"
        )

    bars_html: list[str] = []
    for c in cases_sorted[:12]:
        width = (float(c["duration"]) / max_dur) * 100
        color = "#0C66E4" if c["result"] == "Passed" else "#C9372C"
        bars_html.append(
            "<div class='bar-row'>"
            f"<div class='bar-label'>{html.escape(str(c['name']))}</div>"
            "<div class='bar-track'>"
            f"<div class='bar-fill' style='width:{width:.2f}%; background:{color};'></div>"
            "</div>"
            f"<div class='bar-time'>{float(c['duration']):.3f}s</div>"
            "</div>"
        )

    domain_html: list[str] = []
    for domain, stat in sorted(by_domain.items(), key=lambda x: x[1]["total"], reverse=True):
        total = max(1, stat["total"])
        pass_pct = stat["passed"] / total * 100
        fail_pct = stat["failed"] / total * 100
        skip_pct = stat["skipped"] / total * 100
        domain_html.append(
            "<div class='domain-card'>"
            f"<div class='domain-title'>{html.escape(domain)}</div>"
            "<div class='stacked'>"
            f"<span class='seg pass' style='width:{pass_pct:.2f}%'></span>"
            f"<span class='seg fail' style='width:{fail_pct:.2f}%'></span>"
            f"<span class='seg skip' style='width:{skip_pct:.2f}%'></span>"
            "</div>"
            f"<div class='domain-meta'>{stat['passed']} pass / {stat['failed']} fail / {stat['skipped']} skip</div>"
            "</div>"
        )

    donut_style = (
        f"background: conic-gradient(#1F845A 0 {pass_rate:.2f}%, "
        f"#C9372C {pass_rate:.2f}% {pass_rate + fail_rate:.2f}%, "
        f"#7F5F01 {pass_rate + fail_rate:.2f}% 100%);"
    )

    html_doc = f"""<!doctype html>
<html lang='en'>
<head>
  <meta charset='utf-8' />
  <meta name='viewport' content='width=device-width, initial-scale=1' />
  <title>Glassroom Executive Test Report</title>
  <style>
    :root {{
      --bg: #F4F6F8; --text: #172B4D; --muted: #5E6C84; --line: #DFE1E6; --panel: #FFFFFF;
      --blue: #0C66E4; --green: #1F845A; --red: #C9372C; --yellow: #7F5F01;
    }}
    * {{ box-sizing: border-box; }}
    body {{ margin: 0; font-family: 'Segoe UI', Roboto, Arial, sans-serif; color: var(--text); background: radial-gradient(circle at 10% 0%, #E9F2FF 0%, var(--bg) 35%), var(--bg); }}
    .wrap {{ max-width: 1240px; margin: 0 auto; padding: 26px; }}
    .hero {{ position: relative; overflow: hidden; background: linear-gradient(130deg, #0C66E4 0%, #1D7AFC 45%, #5BA3FF 100%); border-radius: 16px; padding: 26px; color: #fff; box-shadow: 0 18px 40px rgba(9, 30, 66, 0.22); }}
    .hero:before {{ content: ''; position: absolute; right: -120px; top: -120px; width: 320px; height: 320px; background: rgba(255,255,255,0.16); border-radius: 50%; }}
    .hero:after {{ content: ''; position: absolute; right: 140px; bottom: -140px; width: 280px; height: 280px; background: rgba(255,255,255,0.12); border-radius: 50%; }}
    .hero h1 {{ margin: 0; font-size: 34px; letter-spacing: .02em; }} .hero p {{ margin: 8px 0 0; opacity: .95; }}
    .hero-row {{ margin-top: 16px; display: flex; flex-wrap: wrap; gap: 10px; }}
    .pill {{ display: inline-flex; align-items: center; padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.25); color: inherit; text-decoration: none; }}
    .kpi-grid {{ margin-top: 16px; display: grid; grid-template-columns: repeat(5, minmax(160px, 1fr)); gap: 12px; }}
    .kpi {{ background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 14px; box-shadow: 0 2px 6px rgba(9, 30, 66, 0.05); }}
    .kpi .k {{ color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .05em; }} .kpi .v {{ margin-top: 7px; font-size: 30px; font-weight: 750; }} .kpi .m {{ margin-top: 8px; color: var(--muted); font-size: 12px; }}
    .layout {{ margin-top: 14px; display: grid; grid-template-columns: 1.1fr 1fr; gap: 12px; }}
    .panel {{ background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 14px; box-shadow: 0 2px 6px rgba(9, 30, 66, 0.05); }} .panel h2 {{ margin: 0 0 10px; font-size: 18px; }}
    .viz-grid {{ display: grid; grid-template-columns: 240px 1fr; gap: 16px; align-items: center; }} .donut-wrap {{ display: grid; place-items: center; }}
    .donut {{ width: 180px; height: 180px; border-radius: 50%; {donut_style} display: grid; place-items: center; }} .donut::after {{ content: ''; width: 122px; height: 122px; border-radius: 50%; background: #fff; box-shadow: inset 0 0 0 1px var(--line); }}
    .donut-label {{ position: absolute; text-align: center; font-weight: 700; }} .donut-label .big {{ font-size: 28px; line-height: 1; }} .donut-label .small {{ font-size: 11px; color: var(--muted); margin-top: 4px; text-transform: uppercase; letter-spacing: .06em; }}
    .stacked {{ width: 100%; height: 16px; border-radius: 999px; overflow: hidden; background: #EBECF0; display: flex; align-items: stretch; line-height: 0; box-shadow: inset 0 0 0 1px #DFE1E6; }}
    .seg {{ display: block; height: 100%; min-height: 100%; flex: 0 0 auto; }} .seg.pass {{ background: var(--green); }} .seg.fail {{ background: var(--red); }} .seg.skip {{ background: var(--yellow); }}
    .legend {{ margin-top: 10px; display: flex; flex-wrap: wrap; gap: 8px; font-size: 12px; color: var(--muted); }} .legend span {{ display: inline-flex; align-items: center; gap: 6px; }} .dot {{ width: 10px; height: 10px; border-radius: 50%; display: inline-block; }}
    .bar-row {{ display: grid; grid-template-columns: 1.1fr 2fr auto; gap: 10px; align-items: center; margin: 7px 0; }}
    .bar-label {{ font-size: 12px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }}
    .bar-track {{ height: 12px; background: #EBECF0; border-radius: 999px; overflow: hidden; position: relative; line-height: 0; box-shadow: inset 0 0 0 1px #DFE1E6; }} .bar-fill {{ position: absolute; left: 0; top: 0; bottom: 0; height: 100%; min-height: 100%; border-radius: 999px; }}
    .bar-time {{ font-size: 12px; color: var(--muted); min-width: 54px; text-align: right; }}
    .domain-grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }}
    .domain-card {{ background: #FAFBFC; border: 1px solid var(--line); border-radius: 10px; padding: 10px; display: flex; flex-direction: column; gap: 8px; }}
    .domain-title {{ font-weight: 600; margin-bottom: 0; font-size: 13px; line-height: 1.25; white-space: normal; overflow-wrap: anywhere; word-break: break-word; }}
    .domain-meta {{ margin-top: 0; color: var(--muted); font-size: 12px; }}
    table {{ width: 100%; border-collapse: collapse; font-size: 14px; }} th, td {{ text-align: left; border-bottom: 1px solid var(--line); padding: 10px 8px; vertical-align: top; }} th {{ color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }}
    .badge {{ display: inline-block; font-size: 12px; border-radius: 999px; border: 1px solid; padding: 2px 10px; font-weight: 600; }} .footer {{ margin-top: 10px; color: var(--muted); font-size: 12px; }}
    @media (max-width: 1100px) {{
      .kpi-grid {{ grid-template-columns: repeat(2, minmax(160px, 1fr)); }} .layout {{ grid-template-columns: 1fr; }} .viz-grid {{ grid-template-columns: 1fr; }}
      .bar-row {{ grid-template-columns: 1fr; gap: 5px; }} .bar-time {{ text-align: left; }}
    }}
  </style>
</head>
<body>
  <div class='wrap'>
    <section class='hero'>
      <h1>Glassroom Quality Dashboard</h1>
      <p>Executive snapshot from Vitest suite</p>
      <p><strong>Test types:</strong> {html.escape(args.types)}</p>
      <p><strong>Version ID:</strong> {html.escape(args.version_id)}</p>
      <div class='hero-row'>
        <span class='pill'>Run: {html.escape(run_human)}</span>
        <span class='pill'>Host: {html.escape(hostname)}</span>
        <span class='pill' style='background:{status_bg}; color:{status_tone}; border-color:{status_bg};'>Status: {status}</span>
        <span class='pill'>Scope: Functional + Audio + Sources + UI</span>
        <a class='pill' href='./executive_test_report.html'>v1.5.0 Report HTML</a>
        <a class='pill' href='./vitest-results.xml'>v1.5.0 JUnit XML</a>
      </div>
    </section>
    <section class='kpi-grid'>
      <div class='kpi'><div class='k'>Total Tests</div><div class='v'>{tests}</div><div class='m'>Vitest + RTL coverage</div></div>
      <div class='kpi'><div class='k'>Passed</div><div class='v' style='color:#1F845A'>{passed}</div><div class='m'>Successful checks</div></div>
      <div class='kpi'><div class='k'>Failed/Error</div><div class='v' style='color:#C9372C'>{failed_or_error}</div><div class='m'>Open defects</div></div>
      <div class='kpi'><div class='k'>Runtime</div><div class='v'>{runtime:.2f}s</div><div class='m'>JUnit total runtime</div></div>
      <div class='kpi'><div class='k'>Delivery Risk</div><div class='v' style='color:{risk_color}'>{risk_label}</div><div class='m'>Current release quality signal</div></div>
    </section>
    <section class='layout'>
      <div class='panel'>
        <h2>Quality Composition</h2>
        <div class='viz-grid'>
          <div class='donut-wrap'><div style='position:relative;'><div class='donut'></div><div class='donut-label'><div class='big'>{pass_rate:.1f}%</div><div class='small'>Pass Rate</div></div></div></div>
          <div>
            <div class='stacked'><span class='seg pass' style='width:{pass_rate:.2f}%'></span><span class='seg fail' style='width:{fail_rate:.2f}%'></span><span class='seg skip' style='width:{skip_rate:.2f}%'></span></div>
            <div class='legend'><span><i class='dot' style='background:#1F845A'></i>Passed: {passed}</span><span><i class='dot' style='background:#C9372C'></i>Failed/Error: {failed_or_error}</span><span><i class='dot' style='background:#7F5F01'></i>Skipped: {skipped}</span></div>
            <div style='margin-top:10px; color:#5E6C84; font-size:13px;'>Slowest test: <strong>{html.escape(slowest)}</strong></div>
          </div>
        </div>
      </div>
      <div class='panel'><h2>Execution Duration (Top 12)</h2>{''.join(bars_html)}</div>
    </section>
    <section class='panel'><h2>Coverage Domains</h2><div class='domain-grid'>{''.join(domain_html)}</div></section>
    <section class='panel'>
      <h2>Detailed Evidence</h2>
      <table><tr><th>Test Case</th><th>Domain</th><th>Duration</th><th>Status</th></tr>{''.join(rows_html)}</table>
      <div class='footer'>Source artifacts: reports/vitest-results.xml, reports/executive_test_report.html</div>
    </section>
  </div>
</body>
</html>
"""

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(html_doc, encoding="utf-8")
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
