select
rfs.routing_form_number,
released.seqnum,
rfs.title title,
rfs.summary,
centers.name Center,
users.id user_id,
users.display_name_reverse,
users.hr_pri_appt_org_code,
an_org.name Org,
users.hr_pri_appt_dept_code,
a_dept.name department,
users.official_title,
project_routing_form_users.type,
released.appldate,
awards.dspcodeddate,
awards.adirect,
awards.budgetstartdate,
awards.budgetenddate

from project_routing_form_users
join users on users.id = project_routing_form_users.user_id
join project_routing_form_main_forms rfs on rfs.id = project_routing_form_users.routing_form_id

join organizational_units ou on ou.code = users.hr_pri_appt_org_code
join alternate_names an_org 
   on an_org.nameable_type = 'OrganizationalUnit' 
   and an_org.nameable_id = ou.id
   and an_org.authoritative = 'true'
   
join departments depts on depts.code = users.hr_pri_appt_dept_code
join alternate_names a_dept
   on a_dept.nameable_type = 'department'
   and a_dept.nameable_id = depts.id
   and a_dept.authoritative = 'true'

left join uiris2_project_primary_centers centers
on centers.dept_code = rfs.primary_center_id

left join Grants.dbo.released on released.rnumber = rfs.routing_form_number
left join Grants.dbo.awards on awards.seqnum = released.seqnum

where project_routing_form_users.type in (
'Project::RoutingForm::Investigator',
'Project::RoutingForm::PI',
'Project::RoutingForm::Technician'
)
and rfs.state = 'review'