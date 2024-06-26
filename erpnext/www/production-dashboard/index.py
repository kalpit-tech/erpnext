# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
# MIT License. See license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
import frappe.www.list
from erpnext.modehero.product import get_product_cat_names
from erpnext.modehero.user import haveAccess, haveAccessForFactory

no_cache = 1


def get_context(context):
    if frappe.session.user == 'Guest':
        frappe.throw(
            _("You need to be logged in to access this page"), frappe.PermissionError)

    context.show_sidebar = False
    context.status = 'waiting'

    context.roles = frappe.get_roles(frappe.session.user)
    context.isBrand = "Brand User" in context.roles
    context.isManufacture = "Manufacturing User" in context.roles
    brand = frappe.get_doc("User", frappe.session.user).brand_name
    module = 'production'
    if(context.isBrand):
        if(not haveAccess(module)):
            frappe.throw(
                _("You have not subscribed to this service"), frappe.PermissionError)
        
        context.preprod_onprocess = frappe.get_all(
            'Prototype Order', filters={'docstatus': 0, 'brand': brand}, fields=['name', 'internal_ref', 'product', 'product_category', 'creation', 'expected_work_date'])
        context.preprod_finished = frappe.get_all(
            'Prototype Order', filters={'docstatus': 5, 'brand': brand}, fields=['name', 'internal_ref', 'product', 'product_category', 'creation', 'tracking_number', 'expected_work_date'])
        context.prod_onprocess = frappe.get_all(
            'Production Order', filters={'docstatus': 0, 'brand': brand}, fields=['name', 'internal_ref', 'product_name', 'product_category', 'creation', 'expected_work_date'])
        context.prod_finished = frappe.get_all(
            'Production Order', filters={'docstatus': 1, 'brand': brand}, fields=['name', 'internal_ref', 'product_name', 'product_category', 'creation', 'tracking_number', 'expected_work_date'])
    if(context.isManufacture):
        if(not haveAccessForFactory(module)):
            frappe.throw(
                _("You have not subscribed to this service"), frappe.PermissionError)
        factory_name=frappe.get_all('Production Factory',filters={'email_address':frappe.session.user},fields=['name'])
        context.preprod_onprocess = frappe.get_all(
            'Prototype Order', filters={'docstatus': 0, 'production_factory': factory_name[0]['name']}, fields=['name', 'internal_ref', 'product', 'product_category', 'creation', 'expected_work_date'])
        context.preprod_finished = frappe.get_all(
            'Prototype Order', filters={'docstatus': 5, 'production_factory': factory_name[0]['name']}, fields=['name', 'internal_ref', 'product', 'product_category', 'creation', 'tracking_number', 'expected_work_date'])
        context.prod_onprocess = frappe.get_all(
            'Production Order', filters={'docstatus': 0, 'production_factory': factory_name[0]['name']}, fields=['name', 'internal_ref', 'product_name', 'product_category', 'creation', 'expected_work_date'])
        context.prod_finished = frappe.get_all(
            'Production Order', filters={'docstatus': 1, 'production_factory': factory_name[0]['name']}, fields=['name', 'internal_ref', 'product_name', 'product_category', 'creation', 'tracking_number', 'expected_work_date'])
   
    context.support_dic_product_cats = get_product_cat_names(context.preprod_onprocess+context.preprod_finished+context.prod_onprocess+context.prod_finished,brand)
    return context

