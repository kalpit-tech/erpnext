# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
# MIT License. See license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
import frappe.www.list

no_cache = 1


def get_context(context):
    if frappe.session.user == 'Guest':
        frappe.throw(
            _("You need to be logged in to access this page"), frappe.PermissionError)

    context.show_sidebar = False
    context.status = 'waiting'

    query = """select so.name, so.creation, i.item_name, i.item_group from `tabSales Order` so left join `tabSales Order Item` i on i.parent = so.name"""
    context.waiting = frappe.db.sql(query+" where i.docstatus=0")
    context.onprocess = frappe.db.sql(query+" where i.docstatus=1")
    context.shipped = frappe.db.sql(query+" where i.docstatus=3")
    context.cancelled = frappe.db.sql(query+" where i.docstatus=2")

    # context.parents = [
    #     {"name": frappe._("Home"), "route": "/"}
    # ]

    return context