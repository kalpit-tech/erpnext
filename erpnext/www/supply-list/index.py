from __future__ import unicode_literals
import frappe
from frappe import _
import frappe.www.list
import datetime

no_cache = 1


def get_context(context):
    brand = frappe.get_doc('User',frappe.session.user).brand_name;
    context.suppliers = frappe.get_list('Supplier',filters={'brand': brand},fields=['supplier_name','name','country','supplier_group','phone_number','contact','email','city','zip_code']);
    return context