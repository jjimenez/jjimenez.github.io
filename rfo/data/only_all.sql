
declare @people table
(rank int,
 pi varchar(250),
 pi_college varchar(250),
 pi_department varchar(250)
 )

insert into @people
select (rank() over(order by pi)) - 1 rank, pi, pi_college, pi_department
from
(

select distinct users.display_name_reverse pi,
case when users.hr_pri_appt_org_code='12'     then 'Business'
when users.hr_pri_appt_org_code = '13' then 'Dentistry'
when users.hr_pri_appt_org_code = '14' then 'Education'
when users.hr_pri_appt_org_code = '15' then 'Engineering'
when users.hr_pri_appt_org_code = '29' then 'Graduate College'
when users.hr_pri_appt_org_code = '16' then 'Law'
when users.hr_pri_appt_org_code = '12' then 'Liberal Arts and Sciences'
when users.hr_pri_appt_org_code = '17' then 'Medicine'
when users.hr_pri_appt_org_code = '18' then 'Nursing'
when users.hr_pri_appt_org_code = '19' then 'Pharmacy'
when users.hr_pri_appt_org_code = '20' then 'Public Health'
else 'Other Administrative Units'
end pi_college, DeptNames.name pi_department
from project_routing_form_users rfu
join project_routing_form_main_forms rfs
  on rfs.id = rfu.routing_form_id
join users
  on users.id = rfu.user_id
join departments depts
  on depts.code = users.hr_pri_appt_dept_code
  and depts.organization_code = users.hr_pri_appt_org_code
join alternate_names DeptNames
  on DeptNames.nameable_id = depts.id
  and DeptNames.nameable_type = 'Department'
  and DeptNames.authoritative = 'true'
where rfs.state='review'
and users.hr_pri_appt_org_code is not null
and rfu.type in ('Project::RoutingForm::PI', 'Project::RoutingForm::Investigators')
) D

declare @awards table
(
rf_item_id int,
award_dollars money
)

insert into @awards
select
dsp_items.id,
awards.atotal
from Grants.dbo.awards
join Grants.dbo.released
on released.seqnum = awards.seqnum
join uiris_production.dsp.dsp_items
on released.rnumber = dsp_items.legacy_id
where awards.dspcodeddate >= '7/1/2010'
and awards.dspcodeddate < '7/1/2015'

declare @only_all table

(source int,
 target int,
 [value] money,
 earliest_collaboration datetime)

 insert into @only_all
select source_id, target_id, sum(award_dollars) [value], min(submit_date) earliest_collaboration
from
(

select  rfs.id, people_pi.rank source_id, people_coi.rank target_id, A.award_dollars, rfs.submit_date
from  project_routing_form_main_forms rfs
join project_routing_form_users rfu_pi
  on rfs.id = rfu_pi.routing_form_id
  and rfu_pi.type = 'Project::RoutingForm::PI'
join project_routing_form_users rfu_coi
  on rfs.id = rfu_coi.routing_form_id
  and rfu_coi.type = 'Project::RoutingForm::Investigator'
join users pis
  on pis.id = rfu_pi.user_id
  and pis.hr_pri_appt_org_code is not null
join @people people_pi
  on people_pi.pi = pis.display_name_reverse
join users cois
  on cois.id = rfu_coi.user_id
  and cois.hr_pri_appt_org_code is not null
join @people people_coi
on people_coi.pi = cois.display_name_reverse
join @awards A
on A.rf_item_id = rfs.dsp_item_id
where rfs.state='review'
)
 D
 group by source_id, target_id

 select * from @people

 select source, target, cast(value as int) value, earliest_collaboration from @only_all
 order by source, target

