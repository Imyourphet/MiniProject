import { useState } from 'react';
import { ActionButton, ActionForm, Card, Field, Select, Table } from '../components/UI';
import { MasterEditor } from './Masters';
import { byId, routeStops } from '../lib/shuttle';

export default function RoutesPage(props) {
  const { data, dispatch } = props;
  const [selected, setSelected] = useState(data.routes[0]?.id || '');
  const stops = routeStops(data, selected);
  return <><MasterEditor {...props} collection="routes" title="เส้นทาง" fields={[{ name: 'name', label: 'ชื่อเส้นทาง' }]} />
    <Card title="จุดจอดตามเส้นทาง"><Select label="เส้นทาง" options={data.routes} value={selected} onChange={event => setSelected(event.target.value)} />
      {byId(data.routes, selected).id && <><Table heads={['ลำดับ', 'จุดจอด', 'นาทีจากจุดก่อนหน้า', 'จัดการ']} empty={!stops.length}>{stops.map(stop => <tr key={stop.seq}><td>{stop.seq}</td><td>{byId(data.stops, stop.stopId).name}</td><td>{stop.travelTime}</td><td><ActionButton className="danger" confirm="ลบจุดจอดนี้ออกจากเส้นทาง?" action={() => dispatch('removeStop', { routeId: selected, seq: stop.seq })}>ลบ</ActionButton></td></tr>)}</Table>
        <ActionForm submit="เพิ่มจุดจอด" onSubmit={values => dispatch('addStop', { routeId: selected, stopId: values.stopId, travelTime: Number(values.travelTime) })}>
          <Select label="จุดจอด" name="stopId" options={data.stops} required /><Field label="นาทีจากจุดก่อนหน้า" name="travelTime" type="number" min="0" defaultValue="5" required />
        </ActionForm></>}
    </Card><MasterEditor {...props} collection="stops" title="ข้อมูลจุดจอด" fields={[{ name: 'name', label: 'ชื่อจุดจอด' }]} /></>;
}