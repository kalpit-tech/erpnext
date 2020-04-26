import frappe
import json
import ast
from erpnext.modehero.stock import updateStock2, get_details_fabric_from_order, get_details_trimming_from_order, get_product_details_from_order


@frappe.whitelist()
def create_prototype_order(data):
    data = json.loads(data)
    user = frappe.get_doc('User', frappe.session.user)
    brand = user.brand_name
    order = frappe.get_doc({
        'doctype': 'Prototype Order',
        'internal_ref': data['internal_ref'],
        'product_category': data['product_category'],
        'product': data['product'],
        'fabric_ref': data['fabric_ref'],
        'fabric_consumption': data['fabric_consumption'],
        'trimming-item': data['trimming_item'],
        'trimming_consumption': data['trimming_consumption'],
        'production_factory': data['production_factory'],
        'final_destination': data['destination'],
        'techpack': data['techpack'],
        'pattern': data['pattern'],
        'picture': data['picture'],
        'price_per_unit': data['price'],
        'quantity_per_size': data['quantity'],
        'comment': data['comment'],
        'brand': brand
    })

    order.insert()
    return {'status': 'ok', 'order': order}


@frappe.whitelist()
def validate(order, isvalidate):
    order = frappe.get_doc('Prototype Order', order)
    if isvalidate == 'true':
        order.docstatus = 1
        order_quantities = get_order_quantities(order)
        if order_quantities != None:
            existing_details = get_old_quantities_unitprice(order)
            if existing_details['fabric_details']:
                updateStock2(existing_details['fabric_details']['stock_name'], existing_details['fabric_details']['old_stock']-order_quantities['fabric_quantity'],
                             existing_details['fabric_details']['old_stock'], "", existing_details['fabric_details']['unit_price'])
            if existing_details['trimming_details']:
                updateStock2(existing_details['trimming_details']['stock_name'], existing_details['trimming_details']['old_stock']- order_quantities['trimming_quantity'],
                             existing_details['trimming_details']['old_stock'], "", existing_details['trimming_details']['unit_price'])

    else:
        order.docstatus = 1
        order.save()
        order.docstatus = 2
    order.save()
    frappe.db.commit()
    return order


@frappe.whitelist()
def submit_production_info(data):
    data = json.loads(data)
    order = frappe.get_doc('Prototype Order', data['order'])
    order.ex_work_date = data['ex_work_date']
    order.invoice = data['invoice']
    order.tracking_number = data['tracking_number']
    order.carrier = data['carrier']
    order.shipment_date = data['shipment_date']
    order.shipment_price = data['shipment_price']
    order.production_comment = data['production_comment']
    order.save()
    return order


@frappe.whitelist()
def set_finish(orderslist):
    orderslist = ast.literal_eval(orderslist)
    res_status = "ok"
    for order in orderslist:
        order = frappe.get_doc('Prototype Order', order)
        if (order):
            order.docstatus = 1
            order.save()
            order_quantity = get_total_quantity(order)
            if (order_quantity == None):
                continue
            existing_details = get_product_details_from_order(order,"prototype")
            if existing_details == None:
                continue
            if order.price_per_unit=='' or None:
                order.price_per_unit=0

            updateStock2(existing_details['stock_name'], order_quantity+existing_details['old_stock'],
                         existing_details['old_stock'],"", order.price_per_unit)
        else:
            res_status = "no"
    frappe.db.commit()
    return {'status': res_status}


def get_total_quantity(order):
    total_quantity = 0
    for size in order.quantity_per_size:
        if (size.quantity != None):
            total_quantity = total_quantity + int(size.quantity)
    return total_quantity


def get_order_quantities(order):
    total_quantity = get_total_quantity(order)
    if (total_quantity == 0):
        return None
    try:
        fabric_quantity = total_quantity*int(order.fabric_consumption)
        trimming_quantity = total_quantity*int(order.trimming_consumption)
        return {'total_quantity': total_quantity, 'fabric_quantity': fabric_quantity, 'trimming_quantity': trimming_quantity}
    except:
        return None


def get_old_quantities_unitprice(order):
    # this function returns a dictionary of old quantity values and other details of fabric/trimming
    # data is gathered by functions in stock.py
    fabric_details = get_details_fabric_from_order(order)
    trimming_details = get_details_trimming_from_order(order,"prototype")

    return {'fabric_details': fabric_details, 'trimming_details': trimming_details}