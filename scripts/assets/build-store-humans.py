import bpy,sys,math,json
from pathlib import Path
from mathutils import Vector
# Usage: blender -b --python build-store-humans.py -- SOURCE_DIRECTORY
ROOT=Path(sys.argv[sys.argv.index('--')+1]).resolve()
OUT=ROOT/'export';OUT.mkdir(exist_ok=True)
models=['Male_Adult_12','Male_Adult_08','Female_Adult_14','Chef_Female_01']
for model in models:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 category='Professions' if model.startswith('Chef') else 'Adults'
 folder=ROOT/'Assets'/'Avatars'/category/model
 bpy.ops.import_scene.fbx(filepath=str(folder/'Export'/f'{model}.fbx'))
 rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
 meshes=[o for o in bpy.data.objects if o.type=='MESH']
 # FBX diffuse factor defaults do not match the original texture colors.
 for mat in bpy.data.materials:
  mat.use_nodes=True;nodes=mat.node_tree.nodes;nodes.clear()
  output=nodes.new('ShaderNodeOutputMaterial');bsdf=nodes.new('ShaderNodeBsdfPrincipled')
  mat.node_tree.links.new(bsdf.outputs['BSDF'],output.inputs['Surface'])
  bsdf.inputs['Roughness'].default_value=.82;bsdf.inputs['Metallic'].default_value=0
  files=list((folder/'Textures').glob('*.tga'))
  part='head' if 'head' in mat.name else 'opacity' if 'opacity' in mat.name else 'body'
  for kind in ['color','normal']:
   source=next((f for f in files if part in f.name and kind in f.name),None)
   if not source:continue
   image=bpy.data.images.load(str(source),check_existing=True)
   size=1024 if kind=='color' and part=='body' else 512
   image.scale(size,size);image.filepath_raw=str(OUT/(model+'_'+part+'_'+kind+'.png'));image.file_format='PNG';image.save()
   image.pack();node=nodes.new('ShaderNodeTexImage');node.image=image
   if kind=='color':
    mat.node_tree.links.new(node.outputs['Color'],bsdf.inputs['Base Color'])
    if part=='opacity':
     mat.node_tree.links.new(node.outputs['Alpha'],bsdf.inputs['Alpha']);mat.surface_render_method='DITHERED'
   else:
    image.colorspace_settings.name='Non-Color';normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.65
    mat.node_tree.links.new(node.outputs['Color'],normal.inputs['Color']);mat.node_tree.links.new(normal.outputs['Normal'],bsdf.inputs['Normal'])
 # Split actual garment faces into tintable materials while retaining authored UVs.
 for mesh in meshes:
  original=list(mesh.data.materials)
  additions={}
  for index,mat in enumerate(original):
   if 'body' not in mat.name:continue
   for region in ['top','trousers','shoes','skin']:
    copy=mat.copy();copy.name='human_'+region
    mesh.data.materials.append(copy);additions[(index,region)]=len(mesh.data.materials)-1
  groups={g.index:g.name for g in mesh.vertex_groups}
  for poly in mesh.data.polygons:
   idx=poly.material_index
   if (idx,'top') not in additions:continue
   vertices=[mesh.data.vertices[i] for i in poly.vertices]
   center=sum((mesh.matrix_world@v.co for v in vertices),Vector())/len(vertices)
   hand=sum(sum(g.weight for g in v.groups if any(n in groups.get(g.group,'') for n in ['Hand','Finger'])) for v in vertices)/len(vertices)
   cutoff=.75 if model=='Female_Adult_14' else .9
   region='skin' if hand>.35 else 'shoes' if center.z<.16 else 'trousers' if center.z<cutoff else 'top'
   poly.material_index=additions[(idx,region)]
 rig.animation_data_clear()
 for a in list(bpy.data.actions):bpy.data.actions.remove(a)
 gender='f' if model.startswith(('Female','Chef')) else 'm'
 clips={'Idle_Loop':('static','idle_neutral_01'),'Walk_Loop':('xy','walk_neutral_01'),'Jog_Fwd_Loop':('xy','run_neutral_01'),'PickUp_Table':('static','documents_take'),'Idle_Talking_Loop':('static','gestic_talk_neutral_01')}
 for name,(group,source) in clips.items():
  before=set(bpy.data.objects)
  bpy.ops.import_scene.fbx(filepath=str(ROOT/'Assets'/'Animations'/('all_animations_max_motextr_'+group)/(gender+'_'+source+'.max.fbx')))
  imported=set(bpy.data.objects)-before
  ar=next(o for o in imported if o.type=='ARMATURE')
  source_action=ar.animation_data.action
  start,end=map(int,source_action.frame_range)
  if name=='Idle_Loop':end=min(end,start+150)
  if name=='Idle_Talking_Loop':end=min(end,start+180)
  if name=='PickUp_Table':end=min(end,start+45)
  rig.animation_data_create();rig.animation_data.action=None
  for old in rig.animation_data.nla_tracks:old.mute=True
  for bone in rig.pose.bones:
   bone.matrix_basis.identity()
   if bone.name in ar.pose.bones:
    constraint=bone.constraints.new('COPY_ROTATION');constraint.target=ar;constraint.subtarget=bone.name
    constraint.target_space='POSE';constraint.owner_space='POSE'
  bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
  bpy.ops.nla.bake(frame_start=start,frame_end=end,step=1,only_selected=False,visual_keying=True,clear_constraints=True,use_current_action=False,bake_types={'POSE'})
  action=rig.animation_data.action;action.name=name;action.use_fake_user=True
  # Keep authored bone lengths; translation is owned by the character controller.
  for curve in list(action.fcurves):
   if curve.data_path.endswith(('.location','.scale')):action.fcurves.remove(curve)
  rig.animation_data.action=None
  for o in imported:bpy.data.objects.remove(o,do_unlink=True)
  rig.animation_data_create();track=rig.animation_data.nla_tracks.new();track.name=name
  track.strips.new(name,1,action)
 # Select only the intended mesh and rig; extra source actions cannot leak into exports.
 bpy.ops.object.select_all(action='DESELECT')
 rig.select_set(True)
 for m in meshes:
  m.select_set(True)
  for p in m.data.polygons:p.use_smooth=True
 bpy.context.view_layer.objects.active=rig
 for track in rig.animation_data.nla_tracks:track.mute=True
 # glTF NLA mode exports named strips independently, even with all tracks muted.
 bpy.ops.export_scene.gltf(filepath=str(OUT/(model+'.glb')),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_force_sampling=True,export_frame_range=False,export_optimize_animation_size=True,export_morph=False,export_cameras=False,export_lights=False)
 print('EXPORTED',model,flush=True)
