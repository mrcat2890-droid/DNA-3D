/**
 * Procedural 3D B-DNA Helix Model Generator
 * High-fidelity geometric replication of the scientific reference image:
 * - Dual helical ribbon backbones with iridescent PBR shading & major/minor grooves
 * - Pentagonal Deoxyribose sugar rings attached along the strands
 * - Faceted geometric base plates (Adenine, Thymine, Guanine, Cytosine)
 * - Segmented glowing hydrogen bond beads (2 for A-T, 3 for G-C)
 */

class DNAModel {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.basePairs = [];
    this.annotationAnchors = {};
    
    // Geometric constants for B-DNA model
    this.radius = 7.5;
    this.height = 68;
    this.turns = 2.6;
    this.basePairCount = 32;
    this.minorGrooveAngle = 2.45; // ~140 degrees creates accurate major and minor grooves

    this.init();
  }

  init() {
    this.createRibbonStrands();
    this.createBasePairsAndSugars();
    this.scene.add(this.group);

    // Initial orientation to match the angle in the reference image
    this.group.rotation.x = 0.22;
    this.group.rotation.y = -0.45;
    this.group.rotation.z = 0.35;
  }

  /**
   * Generates continuous smooth 3D ribbon geometries for Strand 1 & Strand 2
   */
  createRibbonStrands() {
    const segments = 240;
    const strand1Geom = this.buildRibbonGeometry(0, segments);
    const strand2Geom = this.buildRibbonGeometry(this.minorGrooveAngle, segments);

    // Strand 1 Material: Iridescent Magenta / Violet with clearcoat
    const strand1Mat = new THREE.MeshPhysicalMaterial({
      color: 0x8b5cf6,
      emissive: 0x2e1065,
      emissiveIntensity: 0.25,
      roughness: 0.28,
      metalness: 0.35,
      clearcoat: 0.85,
      clearcoatRoughness: 0.15,
      side: THREE.DoubleSide
    });

    // Strand 2 Material: Deep Teal / Cyan sheen with clearcoat
    const strand2Mat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      emissive: 0x082f49,
      emissiveIntensity: 0.3,
      roughness: 0.25,
      metalness: 0.4,
      clearcoat: 0.9,
      clearcoatRoughness: 0.1,
      side: THREE.DoubleSide
    });

    this.strandMesh1 = new THREE.Mesh(strand1Geom, strand1Mat);
    this.strandMesh2 = new THREE.Mesh(strand2Geom, strand2Mat);

    this.group.add(this.strandMesh1);
    this.group.add(this.strandMesh2);
  }

  /**
   * Constructs an extruded 3D ribbon band geometry along the helical curve
   */
  buildRibbonGeometry(phaseOffset, segments) {
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    const ribbonWidth = 1.35;
    const ribbonThickness = 0.32;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = (t - 0.5) * this.height;
      const angle = t * this.turns * Math.PI * 2 + phaseOffset;

      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      // Center point on helix cylinder
      const cx = this.radius * cos;
      const cz = this.radius * sin;

      // Radial vector (normal to cylinder)
      const nx = cos;
      const nz = sin;

      // Binormal / helical vertical tilt vector
      const bx = -sin * 0.35;
      const by = 0.93;
      const bz = cos * 0.35;

      // 4 corners of ribbon cross section
      // 0: outer top, 1: inner top, 2: inner bottom, 3: outer bottom
      const halfW = ribbonWidth * 0.5;
      const halfT = ribbonThickness * 0.5;

      const p0 = [cx + nx * halfT - bx * halfW, y - by * halfW, cz + nz * halfT - bz * halfW];
      const p1 = [cx - nx * halfT - bx * halfW, y - by * halfW, cz - nz * halfT - bz * halfW];
      const p2 = [cx - nx * halfT + bx * halfW, y + by * halfW, cz - nz * halfT + bz * halfW];
      const p3 = [cx + nx * halfT + bx * halfW, y + by * halfW, cz + nz * halfT + bz * halfW];

      positions.push(...p0, ...p1, ...p2, ...p3);
      uvs.push(t, 0, t, 0.33, t, 0.66, t, 1);

      // Approximate normals
      normals.push(nx, 0, nz, -nx, 0, -nz, -nx, 0, -nz, nx, 0, nz);

      if (i < segments) {
        const base = i * 4;
        // Outer face (0, 3)
        indices.push(base, base + 4, base + 7, base, base + 7, base + 3);
        // Inner face (1, 2)
        indices.push(base + 1, base + 2, base + 6, base + 1, base + 6, base + 5);
        // Top edge (0, 1)
        indices.push(base, base + 1, base + 5, base, base + 5, base + 4);
        // Bottom edge (2, 3)
        indices.push(base + 3, base + 7, base + 6, base + 3, base + 6, base + 2);
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }

  /**
   * Creates sugar phosphate rings, base pairs, and hydrogen bonds
   */
  createBasePairsAndSugars() {
    // Shared geometries
    const sugarGeom = new THREE.CylinderGeometry(0.85, 0.85, 0.28, 5); // Pentagonal sugar ring
    const purineGeom = new THREE.BoxGeometry(3.0, 0.42, 1.1);          // Longer purine plate
    const pyrimidineGeom = new THREE.BoxGeometry(2.3, 0.42, 1.1);      // Shorter pyrimidine plate
    const bondSphereGeom = new THREE.SphereGeometry(0.2, 10, 10);      // Hydrogen bond bead

    // Base pair types and materials
    const materials = {
      sugarMagenta: new THREE.MeshPhysicalMaterial({
        color: 0xec4899,
        roughness: 0.2,
        metalness: 0.3,
        clearcoat: 0.8,
        emissive: 0x831843,
        emissiveIntensity: 0.35
      }),
      sugarPurple: new THREE.MeshPhysicalMaterial({
        color: 0xa855f7,
        roughness: 0.2,
        metalness: 0.3,
        clearcoat: 0.8,
        emissive: 0x581c87,
        emissiveIntensity: 0.35
      }),
      adenine: new THREE.MeshPhysicalMaterial({
        color: 0x38bdf8, // Ice cyan/blue
        roughness: 0.25,
        metalness: 0.2,
        clearcoat: 0.7,
        emissive: 0x0369a1,
        emissiveIntensity: 0.2
      }),
      thymine: new THREE.MeshPhysicalMaterial({
        color: 0x818cf8, // Indigo violet
        roughness: 0.25,
        metalness: 0.2,
        clearcoat: 0.7,
        emissive: 0x4338ca,
        emissiveIntensity: 0.2
      }),
      guanine: new THREE.MeshPhysicalMaterial({
        color: 0xc084fc, // Orchid magenta
        roughness: 0.25,
        metalness: 0.2,
        clearcoat: 0.7,
        emissive: 0x7e22ce,
        emissiveIntensity: 0.2
      }),
      cytosine: new THREE.MeshPhysicalMaterial({
        color: 0x2dd4bf, // Pale mint teal
        roughness: 0.25,
        metalness: 0.2,
        clearcoat: 0.7,
        emissive: 0x0f766e,
        emissiveIntensity: 0.2
      }),
      hBond: new THREE.MeshBasicMaterial({
        color: 0xa5f3fc // Glowing neon cyan-white
      })
    };

    const pairTypes = [
      { name: 'Adenine - Thymine', type1: 'adenine', type2: 'thymine', bonds: 2, energy: '-13.2 kcal/mol', isAT: true },
      { name: 'Guanine - Cytosine', type1: 'guanine', type2: 'cytosine', bonds: 3, energy: '-18.6 kcal/mol', isAT: false },
      { name: 'Thymine - Adenine', type1: 'thymine', type2: 'adenine', bonds: 2, energy: '-13.1 kcal/mol', isAT: true },
      { name: 'Cytosine - Guanine', type1: 'cytosine', type2: 'guanine', bonds: 3, energy: '-18.4 kcal/mol', isAT: false }
    ];

    for (let i = 0; i < this.basePairCount; i++) {
      const t = (i + 0.5) / this.basePairCount;
      const y = (t - 0.5) * this.height;
      const angle1 = t * this.turns * Math.PI * 2;
      const angle2 = angle1 + this.minorGrooveAngle;

      const p1 = new THREE.Vector3(this.radius * Math.cos(angle1), y, this.radius * Math.sin(angle1));
      const p2 = new THREE.Vector3(this.radius * Math.cos(angle2), y, this.radius * Math.sin(angle2));

      const pairGroup = new THREE.Group();
      const pairInfo = pairTypes[i % pairTypes.length];

      // 1. Sugar Rings on each backbone anchor
      const sugar1 = new THREE.Mesh(sugarGeom, i % 2 === 0 ? materials.sugarMagenta : materials.sugarPurple);
      sugar1.position.copy(p1);
      sugar1.rotation.y = angle1;
      sugar1.rotation.x = Math.PI * 0.5;
      pairGroup.add(sugar1);

      const sugar2 = new THREE.Mesh(sugarGeom, i % 2 === 0 ? materials.sugarPurple : materials.sugarMagenta);
      sugar2.position.copy(p2);
      sugar2.rotation.y = angle2;
      sugar2.rotation.x = Math.PI * 0.5;
      pairGroup.add(sugar2);

      // Vector from p1 to p2
      const dir = new THREE.Vector3().subVectors(p2, p1);
      const span = dir.length();
      dir.normalize();

      const midPoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);

      // Calculate orientation quaternion to align with dir
      const orientQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);

      // 2. Base 1 (Extending from p1 toward center)
      const geom1 = (pairInfo.type1 === 'adenine' || pairInfo.type1 === 'guanine') ? purineGeom : pyrimidineGeom;
      const base1 = new THREE.Mesh(geom1, materials[pairInfo.type1]);
      base1.quaternion.copy(orientQuat);
      const offset1 = new THREE.Vector3().copy(dir).multiplyScalar(span * 0.28);
      base1.position.addVectors(p1, offset1);
      pairGroup.add(base1);

      // 3. Base 2 (Extending from p2 toward center)
      const geom2 = (pairInfo.type2 === 'adenine' || pairInfo.type2 === 'guanine') ? purineGeom : pyrimidineGeom;
      const base2 = new THREE.Mesh(geom2, materials[pairInfo.type2]);
      base2.quaternion.copy(orientQuat);
      const offset2 = new THREE.Vector3().copy(dir).multiplyScalar(-span * 0.28);
      base2.position.addVectors(p2, offset2);
      pairGroup.add(base2);

      // 4. Hydrogen Bond Beads in the central gap
      const bondCount = pairInfo.bonds;
      const bondSpacing = 0.5;
      for (let b = 0; b < bondCount; b++) {
        const bead = new THREE.Mesh(bondSphereGeom, materials.hBond);
        const beadOffset = (b - (bondCount - 1) * 0.5) * bondSpacing;
        bead.position.copy(midPoint).add(new THREE.Vector3(0, beadOffset * 0.4, 0));
        pairGroup.add(bead);
      }

      // Metadata for interactive inspection
      pairGroup.userData = {
        index: i,
        name: pairInfo.name,
        pairType: (pairInfo.type1 === 'adenine' || pairInfo.type1 === 'guanine') ? 'Purine = Pyrimidine' : 'Pyrimidine = Purine',
        bonds: `${bondCount} Hydrogen Bonds (${pairInfo.isAT ? 'A=T' : 'G≡C'})`,
        energy: pairInfo.energy,
        axis: `Z: ${(y * 0.48).toFixed(2)} Å (Groove Ratio: 1.62)`
      };

      this.basePairs.push(pairGroup);
      this.group.add(pairGroup);

      // Store specific 3D anchors for the HUD callouts
      if (i === 24) {
        this.annotationAnchors['LYSINE_127'] = p1.clone();
      } else if (i === 20) {
        this.annotationAnchors['BDNA_HELIX'] = p2.clone();
      } else if (i === 17) {
        this.annotationAnchors['AT_BOND_UPPER'] = midPoint.clone();
      } else if (i === 12) {
        this.annotationAnchors['AT_BOND_LOWER'] = midPoint.clone();
      } else if (i === 10) {
        this.annotationAnchors['NITROGEN_BASE'] = base1.position.clone();
      } else if (i === 7) {
        this.annotationAnchors['BACKBONE_DIR'] = p1.clone();
      } else if (i === 3) {
        this.annotationAnchors['MOL_BINDING'] = p2.clone();
      }
    }
  }

  /**
   * Highlights a base pair when hovered or selected
   */
  highlightBasePair(group, active) {
    if (!group) return;
    group.traverse((child) => {
      if (child.isMesh && child.material && child.material.emissive) {
        if (active) {
          child.userData.origEmissive = child.material.emissive.getHex();
          child.userData.origIntensity = child.material.emissiveIntensity;
          child.material.emissive.setHex(0x00e5ff);
          child.material.emissiveIntensity = 0.9;
        } else if (child.userData.origEmissive !== undefined) {
          child.material.emissive.setHex(child.userData.origEmissive);
          child.material.emissiveIntensity = child.userData.origIntensity;
        }
      }
    });
  }
}

window.DNAModel = DNAModel;
