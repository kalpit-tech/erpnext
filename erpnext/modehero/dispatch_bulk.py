import frappe
import json


def collect_item_destination_data(orders):
    # if lient order final destination is open to select pos also , then this function should be chnged
    supportive_destination_dic = {"destinations":{},"poss":{}}
    supportive_item_dic = {}
    for order in orders:
        if order[5] not in supportive_item_dic:
            supportive_item_dic[order[5]] = get_item_details(order[5])
        if order[3] in supportive_destination_dic["destinations"] or order[3] in supportive_destination_dic["poss"] or order[4] in supportive_destination_dic["destinations"] or order[4] in supportive_destination_dic["poss"]:
            continue
        if order[2]==None and order[0]!=None and order[3]!=None:
            # this is situation of production order has sales order items by client and destination is a client destination
            destination_data_list = frappe.get_all("Destination",filters={'name':order[3]},fields=['destination_name','client_name'])
            if len(destination_data_list)==0:
                continue
            elif destination_data_list[0].client_name==None:
                continue
            client_data_list = frappe.get_all('Customer',{'name':destination_data_list[0].client_name},['customer_name'])
            if len(client_data_list)==0:
                continue
            supportive_destination_dic["destinations"][order[3]] = {"client_id":destination_data_list[0].client_name,"client_name":client_data_list[0].customer_name}
        elif order[2]==None and order[0]==None:
            continue
        elif int(order[2])==0 and order[0]==None and order[4]!=None:
            # this is situation of bulk order destination is a client destination
            destination_data_list = frappe.get_all("Destination",filters={'name':order[4]},fields=['destination_name','client_name'])
            if len(destination_data_list)==0:
                continue
            elif destination_data_list[0].client_name==None:
                continue
            client_data_list = frappe.get_all('Customer',{'name':destination_data_list[0].client_name},['customer_name'])
            if len(client_data_list)==0:
                continue
            supportive_destination_dic["destinations"][order[4]] = {"client_id":destination_data_list[0].client_name,"client_name":client_data_list[0].customer_name}
        elif int(order[2])==1 and order[0]==None and order[4]!=None:
            # this is situation of bulk order destination is a pos
            pos_data_list = frappe.get_all("Point Of Sales",filters={'name':order[4]},fields=['point_of_sale'])
            if len(pos_data_list)==0:
                continue
            supportive_destination_dic["poss"][order[4]] = {"name":pos_data_list[0].point_of_sale}
    return supportive_destination_dic,supportive_item_dic

def  modify_order_list(orders,support_destination_data):
    result_obj = {}
    for order in orders:
        if order[2]==None and order[0]!=None:
            # this is situation of production order has sales order items by client and destination is a client destination
            client_id = support_destination_data["destinations"][order[3]]["client_id"]
            client_name = support_destination_data["destinations"][order[3]]["client_name"]
            if client_id not in result_obj:
                result_obj[client_id]={"show_name":client_name,"orders":[],"max_col_span":0}
            order.append("destination")
            if len(order[15])>result_obj[client_id]["max_col_span"]: result_obj[client_id]["max_col_span"]=len(order[15])
            result_obj[client_id]["orders"].append(order)
        elif order[2]==None and order[0]==None:
            continue
        elif int(order[2])==0 and order[0]==None:
            # this is situation of bulk order destination is a client destination
            client_id = support_destination_data["destinations"][order[4]]["client_id"]
            client_name = support_destination_data["destinations"][order[4]]["client_name"]
            if client_id not in result_obj:
                result_obj[client_id]={"show_name":client_name,"orders":[],"max_col_span":0}
            order.append("destination")
            if len(order[15])>result_obj[client_id]["max_col_span"]: result_obj[client_id]["max_col_span"]=len(order[15])
            result_obj[client_id]["orders"].append(order)
        elif int(order[2])==1 and order[0]==None:
            # this is situation of bulk order destination is a pos
            if order[4] not in result_obj:
                result_obj[order[4]]={"show_name":support_destination_data["poss"][order[4]]["name"],"orders":[],"max_col_span":0}
            order.append("pos")
            if len(order[15])>result_obj[order[4]]["max_col_span"]: result_obj[order[4]]["max_col_span"]=len(order[15])
            result_obj[order[4]]["orders"].append(order)
        order.append(is_editable(order))
    return result_obj

def add_size_quantity_data(orders,item_support):
    for i in range(len(orders)):
        orders[i].append(item_support[orders[i][5]]["item_name"])
        orders[i].append(item_support[orders[i][5]]["sizes"])
        orders[i].append(item_support[orders[i][5]]["current_stock_sizes_quantities"])
        try:
            if orders[i][15]!=None:
                if orders[i][0]!=None:
                    orders[i].append(frappe.get_all('Quantity Per Size',{'order_id':orders[i][0]},['size','quantity']))
                elif orders[i][1]!=None:
                    orders[i].append(frappe.get_all('Production Quantity Per Size',{'parent':orders[i][1]},['size','quantity']))
            else:
                orders[i][15] = [{"size":free_size_name}]
                if orders[i][1]!=None:
                    orders[i].append([{"size":free_size_name,"quantity":frappe.get_doc('Production Order',orders[i][1]).free_size_qty}])
                else:
                    orders[i].append([{"size":free_size_name,"quantity":frappe.get_doc('Sales Order Item',orders[i][0]).free_size_qty}])
        except Exception:
            orders[i].append(None)
    return orders

def add_sent_data(orders,brand):
    for i in range(len(orders)):
        sent_history = []
        sent_history_data_list = []
        is_bulk = {"is":"0","type":"sales_order","index":0}
        if orders[i][0]==None:
            is_bulk = {"is":"1","type":"bulk_order","index":12}
        sent_history_data_list = frappe.get_all('Dispatch Bulk Stock History',{'brand':brand,'is_bulk':is_bulk["is"], is_bulk["type"]:orders[i][is_bulk["index"]]},['name','stock_history','shipment_order'])
        for sent_data in sent_history_data_list:
            sent_data_doc = frappe.get_doc("Stock History",sent_data.stock_history)
            temp_list = []
            if len(sent_data_doc.product_stock_history_per_size)==0:
                temp_list.append({"size":free_size_name,"quantity":sent_data_doc.quantity})
            else:
                for qps in sent_data_doc.product_stock_history_per_size:
                    temp_list.append({"size":qps.size,"quantity":qps.quantity})
            if sent_data.shipment_order!=None:
                try:
                    required_data = ["name","tracking_number","carrier_company","shipping_date","expected_delivery_date","shipping_price","shipping_document","html_tracking_link"]
                    shipment_data = format_to_js_conversion(frappe.get_all("Shipment Order",{"name":sent_data.shipment_order},required_data)[0])
                except Exception:
                    shipment_data = None
            else:
                shipment_data = None
            sent_history.append({"dispatch_name":sent_data.name,"date":sent_data_doc.creation,"quantity_per_size":temp_list,"shipment_data":shipment_data})
        orders[i].append(sent_history)
        orders[i].append(get_current_active_shipment(is_bulk,sent_history_data_list,orders[i],brand))
    return orders

def get_current_active_shipment(is_bulk_data,sent_history_data_list,order,brand):
    # here the logic is the most recent shipment order which is not in dispatch bulk stock history considered as the active shipment
    if is_bulk_data["is"]=="0":
        is_bulk_data["type"]= "sales_order_item"
    elif is_bulk_data["is"]=="1":
        is_bulk_data["type"]= "internal_ref_prod_order"
    required_data = ["name","tracking_number","carrier_company","shipping_date","expected_delivery_date","shipping_price","shipping_document","html_tracking_link"]
    all_shipment_list = frappe.get_all("Shipment Order",{'brand':brand,"docstatus":0,is_bulk_data["type"]:order[is_bulk_data["index"]]},required_data,order_by="creation")
    old_shipment_orders_idx = []
    for x in range(len(all_shipment_list)):
        for y in sent_history_data_list:
            if all_shipment_list[x].name==y.shipment_order:
                old_shipment_orders_idx.append(x)
    all_shipment_list = [i for j, i in enumerate(all_shipment_list) if j not in old_shipment_orders_idx]
    if len(all_shipment_list)>0:
        result =  all_shipment_list[-1]
        result_obj = format_to_js_conversion(result)
        return result_obj
    else:
        return None

def get_item_details(item):
    if item==None:
        return None
    resul_obj = {}
    try:
        item_doc = frappe.get_doc("Item",item)
        resul_obj["item_name"] = item_doc.item_name 
        sqlist = []
        if item_doc.sizing==None:
            resul_obj["sizes"] = None
            sqlist.append({"size":free_size_name,"quantity":frappe.get_doc("Stock",frappe.get_all("Stock",filters={"parent":item})[0].name).quantity})
        else:
            resul_obj["sizes"] = frappe.get_all('Sizing', filters={'parent': item_doc.sizing}, fields=['size'],order_by='idx')
            c = frappe.get_doc("Stock",frappe.get_all("Stock",filters={"parent":item})[0].name).product_stock_per_size
            for sq in c:
                sqlist.append({"size":sq.size,"quantity":sq.quantity})
        resul_obj["current_stock_sizes_quantities"] = sqlist
    except Exception:
        resul_obj["sizes"] = None
        resul_obj["item_name"] = None
        resul_obj["current_stock_sizes_quantities"] = None
    return resul_obj
                
def format_to_js_conversion(doc):
    doc_obj = {}
    for key in doc:
        if doc[key]==None:
            doc_obj[key] = ""
        elif key=="expected_delivery_date" or key=="shipping_date":
            doc_obj[key] = doc[key].strftime('%Y-%m-%d')
        else:
            doc_obj[key] = doc[key]
    return doc_obj


def is_editable(order):
    if order[12]==None : 
        return 0 
    k = 0
    try:
        data = frappe.get_doc("Production Order",order[12])
        # if(data.shipment_date!=None and data.shipment_date!="") or (data.carrier!=None and data.carrier!="") or (data.tracking_number!=None and data.tracking_number!="") :
        if data.docstatus==1:
            k = 1
    except Exception:
        k = 0
    return k