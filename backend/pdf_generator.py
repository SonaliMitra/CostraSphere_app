from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from io import BytesIO
from datetime import datetime
import os

def generate_project_pdf(project_data: dict, cost_breakdown: dict) -> bytes:
    buffer = BytesIO()

    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=0.5*inch, leftMargin=0.5*inch,
                            topMargin=0.75*inch, bottomMargin=0.75*inch)

    elements = []
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#667eea'),
        spaceAfter=30,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )

    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#667eea'),
        spaceAfter=12,
        spaceBefore=12,
        fontName='Helvetica-Bold'
    )

    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=11,
        alignment=TA_LEFT
    )

    logo_path = os.path.join(os.path.dirname(__file__), "..", "assets", "images", "logo.png")
    if os.path.exists(logo_path):
        logo = Image(logo_path, width=1.5*inch, height=1.5*inch)
        elements.append(logo)
        elements.append(Spacer(1, 0.2*inch))

    title = Paragraph("CostraSphere AI", title_style)
    elements.append(title)
    elements.append(Paragraph("Telecom Infrastructure Planning Report", styles['Heading2']))
    elements.append(Spacer(1, 0.3*inch))

    info_data = [
        ["Project Name:", project_data.get("project_name", "N/A")],
        ["Location:", f"{project_data.get('city', 'N/A')}, {project_data.get('country', 'N/A')}"],
        ["Generated Date:", datetime.now().strftime("%Y-%m-%d %H:%M:%S")],
        ["Status:", project_data.get("status", "N/A").upper()],
    ]

    info_table = Table(info_data, colWidths=[2*inch, 4*inch])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f0f4ff')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e0e0e0'))
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 0.3*inch))

    elements.append(Paragraph("Project Specifications", heading_style))
    specs_data = [
        ["Tower Count:", str(project_data.get("tower_count", 0))],
        ["Fiber Distance:", f"{project_data.get('fiber_length_km', 0)} km"],
        ["Terrain Type:", project_data.get("terrain", "N/A").capitalize()],
        ["Labor Type:", project_data.get("labor_type", "N/A").capitalize()],
        ["Worker Count:", str(project_data.get("worker_count", 0))],
        ["Estimated Duration:", f"{project_data.get('estimated_days', 0)} days"],
    ]

    specs_table = Table(specs_data, colWidths=[2*inch, 4*inch])
    specs_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f0f4ff')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e0e0e0'))
    ]))
    elements.append(specs_table)
    elements.append(Spacer(1, 0.3*inch))

    elements.append(Paragraph("Cost Breakdown", heading_style))
    cost_data = [
        ["Cost Component", "Amount"],
        ["Material Cost", f"${cost_breakdown.get('material_cost', 0):,.2f}"],
        ["Labor Cost", f"${cost_breakdown.get('labor_cost', 0):,.2f}"],
        ["Tower Cost", f"${cost_breakdown.get('tower_cost', 0):,.2f}"],
        ["Fiber Cost", f"${cost_breakdown.get('fiber_cost', 0):,.2f}"],
        ["Maintenance Cost", f"${cost_breakdown.get('maintenance_cost', 0):,.2f}"],
        ["Transport Cost", f"${cost_breakdown.get('transport_cost', 0):,.2f}"],
        ["TOTAL PROJECT COST", f"${project_data.get('total_project_cost', 0):,.2f}"],
    ]

    cost_table = Table(cost_data, colWidths=[3*inch, 3*inch])
    cost_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e0e0e0')),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#f0f4ff')),
        ('TEXTCOLOR', (0, -1), (-1, -1), colors.HexColor('#667eea')),
    ]))
    elements.append(cost_table)
    elements.append(Spacer(1, 0.3*inch))

    elements.append(Paragraph("Summary", heading_style))
    summary_text = f"""
    This report provides a comprehensive cost estimation for telecom infrastructure deployment in {project_data.get('city', 'N/A')}, {project_data.get('country', 'N/A')}.
    The project involves installation of {project_data.get('tower_count', 0)} towers and {project_data.get('fiber_length_km', 0)}km of fiber deployment across {project_data.get('terrain', 'N/A')} terrain.
    Total project budget is estimated at ${project_data.get('total_project_cost', 0):,.2f} with an expected completion time of {project_data.get('estimated_days', 0)} days.
    """
    elements.append(Paragraph(summary_text, normal_style))
    elements.append(Spacer(1, 0.2*inch))

    footer_text = """
    <font size=9 color="#999999">
    This report is generated by CostraSphere AI. All estimates are based on historical data and AI calculations.
    Actual costs may vary based on market conditions and project-specific requirements.
    </font>
    """
    elements.append(Paragraph(footer_text, normal_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
