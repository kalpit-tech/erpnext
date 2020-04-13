import frappe
import json


@frappe.whitelist()
def create_sales_order(items, garmentlabel, internalref, profoma):
    prepared = []
    items = json.loads(items)
    for i in items:
        prepared.append({
            "item_name": items[i]['item'],
            "item_code": items[i]['item'],
            "qty": 1,
            "rate": 1,
            "warehouse": "",
            "uom": "pcs",
            "conversion_factor": 1,
            "item_destination": items[i]['destination']
        })

    user = frappe.get_doc('User', frappe.session.user)
    brand = user.brand_name
    customer = frappe.get_list(
        'Customer', filters={'user': frappe.session.user})
    if(len(customer) > 0):
        customer = customer[0]['name']

    order = frappe.get_doc(
        {"doctype": "Sales Order",
         "internal_ref": internalref,
         "customer": customer,
         "company": brand,
         "conversion_rate": 1,
         "plc_conversion_rate": 1,
         "garment_label": garmentlabel,
         "profoma": profoma,
         "items": prepared,
         "price_list_currency": "USD",
         })

    order.insert()

    for i in order.items:
        quantities = items[i.item_name]['quantities']
        for s in quantities:
            qty = quantities[s]

            # qtypersize = frappe.new_doc('Quantity Per Size')
            if qty != '':
                qtypersize = frappe.get_doc({
                    "doctype": "Quantity Per Size",
                    "size": s,
                    "quantity": qty,
                    "order_id": i.name,
                    "product_id": i.item_code
                })
                qtypersize.insert()

    frappe.db.commit()

    return {'status': 'ok', 'order': order}


def on_remove_sales_order(doc, method):
    for i in doc.items:
        docs = frappe.get_list("Quantity Per Size",
                               filters={"order_id": i.name})
        for j in docs:
            frappe.delete_doc("Quantity Per Size", j.name)

    frappe.msgprint(frappe._("Client Purchase Order ")+doc.name + " deleted")


@frappe.whitelist()
def validate_order(order):
    order = frappe.get_doc('Sales Order', order)
    order.docstatus = 1
    order.save()
    frappe.db.commit()
    frappe.msgprint(frappe._("Client Purchase Order ")+order.name+" validated")


@frappe.whitelist()
def delete(order):
    frappe.delete_doc('Sales Order', order)
    frappe.db.commit()


@frappe.whitelist()
def duplicate(order):
    doc = frappe.get_doc('Sales Order', order)
    prepared = []

    for i in doc.items:
        prepared.append({
                        "item_name": i.item_name,
                        "item_code": i.item_code,
                        "qty": i.qty,
                        "rate": i.rate,
                        "warehouse": i.warehouse,
                        "uom": i.uom,
                        "conversion_factor": i.conversion_factor,
                        "item_destination": i.item_destination
                        })

    order = frappe.get_doc(
        {"doctype": "Sales Order",
         "internal_ref": doc.internal_ref,
         "customer": doc.customer,
         "company": doc.company,
         "conversion_rate": doc.conversion_rate,
         "plc_conversion_rate": doc.plc_conversion_rate,
         "garment_label": doc.garment_label,
         "profoma": doc.profoma,
         "items": prepared,
         "price_list_currency": doc.price_list_currency,
         })

    order.insert()

    for i in doc.items:
        qtydocs = frappe.get_list(
            'Quantity Per Size', filters={'order_id': i.name}, fields=['size', 'quantity', 'order_id'])

        for q in qtydocs:
            # get name of newly created sales order items
            order_id = next(
                item for item in order.items if item.item_name == i.item_code).name
            qtypersize = frappe.get_doc({
                "doctype": "Quantity Per Size",
                "size": q.size,
                "quantity": q.quantity,
                "order_id": order_id,
                "product_id": i.item_code
            })
            qtypersize.insert()

    frappe.db.commit()
    frappe.msgprint(frappe._("Client Purchase Order ") +
                    doc.name+" duplicated as "+order.name)


@frappe.whitelist()
def cancel(order):
    order = frappe.get_doc('Sales Order', order)
    order.docstatus = 1
    order.save()
    order.docstatus = 2
    order.save()
    frappe.db.commit()
    frappe.msgprint(frappe._("Client Purchase Order ")+order.name+" cancelled")


@frappe.whitelist()
def calculate_price(products):
    # request format,
    #  products = {'0001':{'XS':1,'S':2},'0002':{'M':3}}

    # response format
    # { '0001':233123,'0002':3424324, 'total':321321313}

    prices = {}
    products = json.loads(products)
    for p in products:
        prices[p] = 0
        for s in products[p]:
            qty = products[p][s]
            price = frappe.get_list('Prices for Quantity', filters={
                                    'parent': p, 'from': ['<=', qty], 'to': ['>=', qty]}, fields=['price'])
            if(len(price) > 0):
                prices[p] += price[0]['price']*float(qty)

    total = 0
    for p in prices:
        total += float(prices[p])
    prices['total'] = total
    return prices