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

    context.orders = frappe.db.sql(
        """select so.name, so.creation, i.item_name, i.item_group from `tabSales Order` so left join `tabSales Order Item` i on i.parent = so.name""")

    # context.parents = [
    #     {"name": frappe._("Home"), "route": "/"}
    # ]

    return context
