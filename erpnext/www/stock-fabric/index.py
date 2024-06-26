# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
# MIT License. See license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
import frappe.www.list
from erpnext.modehero.user import haveAccess
no_cache = 1


def get_context(context):
    if frappe.session.user == 'Guest':
        frappe.throw(
            _("You need to be logged in to access this page"), frappe.PermissionError)

    module = 'stock'
    if(not haveAccess(module)):
        frappe.throw(_("You have not subscribed to this service"),
                     frappe.PermissionError)
    context.show_sidebar = False

    brand = frappe.get_doc("User", frappe.session.user).brand_name

    context.destination = frappe.get_list("Production Factory")

    context.vendors = frappe.get_list("Supplier")

    query = """select f.fabric_ref, s.quantity, s.localization, s.total_value, s.name, f.unit_price from `tabStock` s left join `tabFabric` f on f.name = s.internal_ref where s.item_type=%s and f.brand=%s """

    context.fabrics = frappe.db.sql(query,("fabric",brand))

    return context
